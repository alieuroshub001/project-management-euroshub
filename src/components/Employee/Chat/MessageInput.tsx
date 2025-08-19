import { useRef, useState, useEffect } from 'react';
import { Paperclip, Send, Smile, X, Image as ImageIcon, File, Plus } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker from './EmojiPicker';
import { IMessage } from '@/types/chat';
import Image from "next/image";

interface AttachmentPayload {
  url: string;
  secure_url?: string;
  public_id?: string;
  original_filename?: string;
  format?: string;
  bytes?: number;
  type: 'image' | 'document';
  resource_type?: string;
  name?: string;
}

interface MessageInputProps {
  chatId: string;
  onSend: (content: string, attachments?: AttachmentPayload[]) => void;
  replyingTo?: IMessage | null;
}

export default function MessageInput({ onSend, replyingTo }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message, attachments);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'chat');
      
      try {
        const res = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        
        if (!json.success) throw new Error(json.message || 'Upload failed');
        
        return {
          url: json.data.secure_url,
          secure_url: json.data.secure_url,
          public_id: json.data.public_id,
          original_filename: json.data.original_filename,
          format: json.data.format,
          bytes: json.data.bytes,
          type: json.data.resource_type === 'image' ? 'image' : 'document' as 'image' | 'document',
          resource_type: json.data.resource_type,
          name: json.data.original_filename || file.name,
        };
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        console.error('Upload error:', error);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const validUploads = results.filter(Boolean) as AttachmentPayload[];
      
      if (validUploads.length > 0) {
        setAttachments(prev => [...prev, ...validUploads]);
        toast.success(`${validUploads.length} file(s) uploaded successfully`);
      }
    } catch  {
      toast.error('Some files failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setShowAttachmentMenu(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canSend = (message.trim() || attachments.length > 0) && !isUploading;

  return (
    <div className="relative bg-white border-t border-slate-200">
      {/* Drag and Drop Overlay */}
      {dragActive && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <p className="text-blue-700 font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group">
                {attachment.type === 'image' ? (
                  <div className="relative">
                  <Image
                    src={attachment.url}
                    alt={attachment.name || "Attachment image"}
                    width={80}     // required
                    height={80}    // required
                    className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                  />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <button 
                        onClick={() => removeAttachment(index)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-32 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2 group-hover:bg-slate-200 transition-colors duration-200">
                    <File className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-xs text-slate-600 truncate w-full text-center font-medium">
                      {attachment.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {attachment.bytes ? formatFileSize(attachment.bytes) : 'Unknown size'}
                    </span>
                    <button 
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {isUploading && (
            <div className="mt-3 flex items-center text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
              Uploading files...
            </div>
          )}
        </div>
      )}
      
      {/* Input Area */}
      <div 
        className="p-4"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex items-end space-x-3">
          {/* Attachment Button with Menu */}
          <div className="relative flex space-x-1">
            <button 
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              disabled={isUploading}
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Attachment Menu */}
            {showAttachmentMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <ImageIcon className="w-4 h-4 mr-3 text-blue-500" />
                  Upload Images
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <File className="w-4 h-4 mr-3 text-green-500" />
                  Upload Documents
                </button>
              </div>
            )}

            {/* Hidden file inputs */}
            <input 
              type="file" 
              ref={imageInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              multiple 
              accept="image/*"
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              multiple 
              accept=".pdf,.doc,.docx,.txt,.zip,.rar"
            />
          </div>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <div className="relative bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-blue-500 focus-within:bg-white transition-all duration-200">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 pr-12 min-h-[48px] max-h-[120px] placeholder-slate-500 text-slate-800 rounded-2xl"
                placeholder={replyingTo ? "Reply to message..." : "Type a message..."}
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isUploading}
              />
              
              {/* Emoji Button */}
              <div className="absolute right-3 bottom-3">
                <button 
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isUploading}
                >
                  <Smile className="w-5 h-5" />
                </button>
                
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-lg overflow-hidden border border-slate-200">
                    <EmojiPicker 
                      onSelect={(emoji) => {
                        setMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }} 
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Character Count */}
            {message.length > 800 && (
              <div className="absolute -bottom-5 right-0 text-xs text-slate-400">
                {message.length}/1000
              </div>
            )}
          </div>
          
          {/* Send Button */}
          <button 
            className={`p-3 rounded-full transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl ${
              canSend
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            disabled={!canSend}
            onClick={handleSend}
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-2 bg-blue-50 rounded-lg p-2">
            <div className="flex items-center space-x-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm font-medium">Uploading attachments...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close menus */}
      {(showEmojiPicker || showAttachmentMenu) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowEmojiPicker(false);
            setShowAttachmentMenu(false);
          }}
        ></div>
      )}
    </div>
  );
}