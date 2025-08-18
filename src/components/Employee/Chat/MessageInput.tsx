import { useState, useRef, useEffect } from 'react';
import { FiPaperclip, FiSmile, FiSend } from 'react-icons/fi';
import EmojiPicker from './EmojiPicker';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'sonner';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected } = useSocket();

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message, attachments);
      setMessage('');
      setAttachments([]);
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
    const formUploads = files.map(async (file) => {
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
          type: json.data.type as 'image' | 'document',
          resource_type: json.data.resource_type,
          name: json.data.name,
        };
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const results = await Promise.all(formUploads);
    const valid = results.filter(Boolean) as AttachmentPayload[];
    if (valid.length > 0) setAttachments((prev) => [...prev, ...valid]);
    // reset input
    e.currentTarget.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const controller = new AbortController();
    const sendTyping = async () => {
      try {
        if (!message.trim()) return;
        await fetch(`/api/chat/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: true }),
          signal: controller.signal,
        });
      } catch {}
    };
    sendTyping();
    return () => controller.abort();
  }, [message, chatId]);

  return (
    <div className="relative">
      {attachments.length > 0 && (
        <div className="flex space-x-2 mb-2 overflow-x-auto">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative">
              {attachment.type === 'image' ? (
                // Thumbnail preview; next/image not ideal with blob/previews
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-20 w-20 object-cover rounded"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-xs truncate px-1">{attachment.name}</span>
                </div>
              )}
              <button 
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center bg-white rounded-lg border">
        <button 
          className="p-2 text-gray-500 hover:text-gray-700"
          onClick={() => fileInputRef.current?.click()}
        >
          <FiPaperclip />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            multiple 
          />
        </button>
        
        <div className="relative flex-1">
          <textarea
            className="w-full border-0 focus:ring-0 resize-none py-2 px-3 max-h-32"
            placeholder="Type a message..."
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <button 
            className="absolute right-2 bottom-2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FiSmile />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-10 right-0 z-10">
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
        
        <button 
          className="p-2 text-blue-500 hover:text-blue-700 disabled:text-gray-300"
          disabled={!message.trim() && attachments.length === 0}
          onClick={handleSend}
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
}