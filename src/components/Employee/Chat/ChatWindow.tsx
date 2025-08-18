import { useState, useEffect, useRef } from 'react';
import { IMessage } from '@/types/chat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { useSocket } from '@/context/SocketContext';

interface ChatWindowProps {
  messages: IMessage[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatWindow({ messages, onSendMessage, messagesEndRef }: ChatWindowProps) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socket = useSocket();
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (userId: string) => {
      setTypingUsers(prev => 
        prev.includes(userId) ? prev : [...prev, userId]
      );
      
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }, 3000);
    };

    socket.on('userTyping', handleTyping);

    return () => {
      socket.off('userTyping', handleTyping);
    };
  }, [socket]);

  const handleSend = (content: string, attachments: any[] = []) => {
    if (content.trim() || attachments.length > 0) {
      onSendMessage(content, attachments);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div 
        ref={windowRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble key={message._id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <TypingIndicator users={typingUsers} />
      
      <div className="p-4 border-t">
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}