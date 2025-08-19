import { useState, useRef } from 'react';
import { IMessage } from '@/types/chat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { X, Reply } from 'lucide-react';

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

interface ChatWindowProps {
  chatId: string;
  messages: IMessage[];
  onSendMessage: (
    content: string,
    attachments?: AttachmentPayload[]
  ) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // ✅ Fixed: Allow null
}

export default function ChatWindow({ 
  chatId, 
  messages, 
  onSendMessage, 
  onDeleteMessage, 
  onEditMessage, 
  messagesEndRef 
}: ChatWindowProps) {
  const [replyingTo, setReplyingTo] = useState<IMessage | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleSend = (
    content: string,
    attachments: AttachmentPayload[] = []
  ) => {
    if (content.trim() || attachments.length > 0) {
      onSendMessage(content, attachments);
      setReplyingTo(null); // Clear reply after sending
    }
  };

  const handleReply = (message: IMessage) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Group messages by date
  const groupMessagesByDate = (messages: IMessage[]) => {
    const groups: { [key: string]: IMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Container - Scrollable, Takes Remaining Space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 bg-gradient-to-b from-slate-50/30 to-white/50"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No messages yet</h3>
              <p className="text-slate-500 text-base">Start the conversation by sending a message below!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, messagesInGroup]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-slate-100 px-3 py-1 rounded-full">
                    <span className="text-xs font-medium text-slate-600">
                      {formatDateHeader(date)}
                    </span>
                  </div>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-4">
                  {messagesInGroup.map((message, index) => (
                    <MessageBubble 
                      key={message._id ? String(message._id) : index}
                      message={message}
                      onDelete={onDeleteMessage}
                      onEdit={onEditMessage}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex-shrink-0 px-6 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex items-start justify-between bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Reply className="w-4 h-4 text-blue-500 mt-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700 mb-1">
                  Replying to {typeof replyingTo.sender === 'object' 
                    ? (replyingTo.sender as { name?: string }).name || 'someone'
                    : 'someone'
                  }
                </div>
                <div className="text-sm text-slate-500 truncate">
                  {replyingTo.content || 'Message with attachments'}
                </div>
              </div>
            </div>
            <button
              onClick={cancelReply}
              className="flex-shrink-0 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Message Input - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white">
        <MessageInput chatId={chatId} onSend={handleSend} replyingTo={replyingTo} />
      </div>
    </div>
  );
}