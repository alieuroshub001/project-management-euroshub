import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, Smile, X, Image as ImageIcon, File, Mic } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker from './EmojiPicker';

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
}

export default function MessageInput({ chatId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    const uploadPromises = files.map(async (file) => {
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
    } catch (error) {
      toast.error('Some files failed to upload');
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
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

  // Typing indicator
  useEffect(() => {
    if (!message.trim()) return;
    
    const controller = new AbortController();
    const sendTyping = async () => {
      try {
        await fetch(`/api/chat/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: true }),
          signal: controller.signal,
        });
      } catch (error) {
        // Silently fail for typing indicator
      }
    };
    
    const timer = setTimeout(sendTyping, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [message, chatId]);

  const canSend = (message.trim() || attachments.length > 0) && !isUploading;

  return (
    <div className="relative bg-white border-t border-slate-200">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group">
                {attachment.type === 'image' ? (
                  <div className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
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
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* Attachment Button */}
          <div className="flex space-x-1">
            <button 
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden" 
                multiple 
                accept="image/*,application/*,.pdf,.doc,.docx,.txt"
              />
            </button>
            
            {/* Voice Message Button */}
            <button 
              className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
                isRecording 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800'
              }`}
              onClick={() => setIsRecording(!isRecording)}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </button>
          </div>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <div className="relative bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-blue-500 focus-within:bg-white transition-all duration-200">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 pr-12 max-h-32 placeholder-slate-500 text-slate-800 rounded-2xl"
                placeholder={isRecording ? "Recording voice message..." : "Type a message..."}
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRecording || isUploading}
              />
              
              {/* Emoji Button */}
              <div className="absolute right-3 bottom-3">
                <button 
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isRecording}
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
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-3 flex items-center justify-center space-x-2 text-red-600 bg-red-50 rounded-lg p-2">
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm font-medium">Recording voice message...</span>
            <button 
              onClick={() => setIsRecording(false)}
              className="text-red-600 hover:text-red-800 font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        )}
        
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
      
      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowEmojiPicker(false)}
        ></div>
      )}
    </div>
  );
}