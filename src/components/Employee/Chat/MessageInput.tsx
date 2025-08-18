import { useState, useRef, useEffect } from 'react';
import { FiPaperclip, FiSmile, FiSend } from 'react-icons/fi';
import EmojiPicker from './EmojiPicker';
import { useSocket } from '@/context/SocketContext';

interface MessageInputProps {
  onSend: (content: string, attachments?: any[]) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socket = useSocket();

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.split('/')[0] as 'image' | 'video' | 'audio' | 'document',
        name: file.name,
        file
      }));
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!socket) return;

    if (message) {
      socket.emit('typing');
    }
  }, [message, socket]);

  return (
    <div className="relative">
      {attachments.length > 0 && (
        <div className="flex space-x-2 mb-2 overflow-x-auto">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative">
              {attachment.type === 'image' ? (
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