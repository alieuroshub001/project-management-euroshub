import { useState, useEffect, useRef } from 'react';
import { IMessage } from '@/types/chat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  chatId: string;
  messages: IMessage[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatWindow({ chatId, messages, onSendMessage, messagesEndRef }: ChatWindowProps) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const fetchTyping = async () => {
      try {
        const res = await fetch(`/api/chat/${chatId}/typing`);
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const ids = json.data.map((t: any) => t.userId?._id || t.userId);
          setTypingUsers(ids);
        }
      } catch {}
    };
    fetchTyping();
    timer = setInterval(fetchTyping, 3000);
    return () => { if (timer) clearInterval(timer); };
  }, [chatId]);

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
        <MessageInput chatId={chatId} onSend={handleSend} />
      </div>
    </div>
  );
}