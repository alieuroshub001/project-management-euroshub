import { IMessage } from '@/types/chat';
import Image from 'next/image';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, MoreVertical } from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';
import { useState } from 'react';

interface MessageBubbleProps {
  message: IMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const isCurrentUser = true; // Replace with actual user check
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <div className={`flex group ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for other users */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-3">
            {typeof message.sender === 'object' && (message.sender as { profileImage?: string })?.profileImage ? (
              <Image
                src={(message.sender as { profileImage?: string }).profileImage as string}
                alt={(message.sender as { name?: string }).name || 'User'}
                width={32}
                height={32}
                className="rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                {typeof message.sender === 'object' && (message.sender as { name?: string }).name 
                  ? getInitials((message.sender as { name?: string }).name as string)
                  : 'U'
                }
              </div>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <div 
          className="relative"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg border-l-3 bg-slate-50 ${
              isCurrentUser ? 'border-l-blue-300' : 'border-l-slate-300'
            }`}>
              <div className="flex items-center mb-1">
                <Reply className="w-3 h-3 text-slate-400 mr-1" />
                <span className="text-xs font-medium text-slate-600">
                  Replying to {typeof message.replyTo === 'object' ? 
                    ((message.replyTo as { sender?: { name?: string } }).sender?.name || 'someone') : 
                    'message'
                  }
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {typeof message.replyTo === 'object' ? 
                  ((message.replyTo as { content?: string }).content || 'message') : 
                  'message'
                }
              </p>
            </div>
          )}
          
          {/* Main message bubble */}
          <div className={`relative rounded-2xl px-4 py-3 shadow-sm ${
            isCurrentUser 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
              : 'bg-white border border-slate-200 text-slate-800'
          } ${
            message.content || message.attachments?.length ? '' : 'hidden'
          }`}>
            {/* Sender name for group chats */}
            {!isCurrentUser && typeof message.sender === 'object' && (message.sender as { name?: string }).name && (
              <div className="text-xs font-semibold text-blue-600 mb-1">
                {(message.sender as { name?: string }).name}
              </div>
            )}
            
            {/* Message text */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </div>
            )}
            
            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className={`${message.content ? 'mt-3' : ''} space-y-2`}>
                {message.attachments.map((attachment, index) => (
                  <AttachmentPreview key={index} attachment={attachment} />
                ))}
              </div>
            )}
            
            {/* Message time and status */}
            <div className={`flex items-center justify-end mt-2 space-x-1 text-xs ${
              isCurrentUser ? 'text-blue-100' : 'text-slate-500'
            }`}>
              <span className="select-none">
                {formatMessageTime(message.createdAt)}
              </span>
              
              {/* Message status for current user */}
              {isCurrentUser && (
                <div className="flex items-center">
                  {message.status === 'read' ? (
                    <CheckCheck className="w-4 h-4 text-blue-200" />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-4 h-4 text-blue-300" />
                  ) : (
                    <Check className="w-4 h-4 text-blue-300" />
                  )}
                </div>
              )}
            </div>
            
            {/* Message tail */}
            <div className={`absolute top-3 ${
              isCurrentUser 
                ? '-right-1 border-l-8 border-l-blue-500 border-t-8 border-t-transparent border-b-8 border-b-transparent' 
                : '-left-1 border-r-8 border-r-white border-t-8 border-t-transparent border-b-8 border-b-transparent'
            } w-0 h-0`}></div>
          </div>
          
          {/* Message actions (hover) */}
          {showActions && (
            <div className={`absolute top-0 ${
              isCurrentUser ? '-left-12' : '-right-12'
            } flex items-center space-x-1 bg-white shadow-lg border border-slate-200 rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}>
              <button className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700">
                <Reply className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}