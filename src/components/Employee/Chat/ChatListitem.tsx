import { IChatDocument } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { Hash, Users, Paperclip, Check, CheckCheck } from 'lucide-react';

interface ChatListItemProps {
  chat: IChatDocument;
  isActive: boolean;
  onClick: () => void;
}

export default function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const getChatName = () => {
    if (chat.name) return chat.name;
    if (!chat.isGroup && chat.participants) {
      const creatorId = typeof chat.createdBy === 'object' ? (chat.createdBy as { _id?: string })._id : (chat.createdBy as unknown as string);
      const otherParticipant = chat.participants.find(p => 
        typeof p === 'object' && (p as { _id?: string })._id !== creatorId
      ) as { name?: string } | undefined;
      return otherParticipant?.name || 'Direct Message';
    }
    return 'Group Chat';
  };

  const getLastMessagePreview = () => {
    if (!chat.lastMessage) return 'No messages yet';
    if (chat.lastMessage.attachments?.length > 0) {
      const senderName = chat.lastMessage.sender?.name || 'Someone';
      return `${senderName} sent an attachment`;
    }
    return chat.lastMessage.content || 'Message';
  };

  const getAvatarProps = () => {
    if (chat.avatar) return { src: chat.avatar, alt: chat.name || '' };
    if (!chat.isGroup && chat.participants) {
      const creatorId = typeof chat.createdBy === 'object' ? (chat.createdBy as { _id?: string })._id : (chat.createdBy as unknown as string);
      const otherParticipant = chat.participants.find(p => 
        typeof p === 'object' && (p as { _id?: string })._id !== creatorId
      ) as { name?: string; profileImage?: string } | undefined;
      return { 
        src: otherParticipant?.profileImage, 
        alt: otherParticipant?.name 
      };
    }
    return { alt: chat.name || 'Group' };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  const avatarProps = getAvatarProps();
  const chatName = getChatName();

  return (
    <div
      className={`relative flex items-center p-4 cursor-pointer transition-all duration-200 group ${
        isActive 
          ? 'bg-blue-50 border-r-3 border-blue-500' 
          : 'hover:bg-slate-100'
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mr-3">
        {avatarProps.src ? (
          <Image
            src={avatarProps.src}
            alt={avatarProps.alt || 'Chat'}
            width={48}
            height={48}
            className="rounded-full object-cover border-2 border-white shadow-sm"
          />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
            chat.isGroup 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
              : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}>
            {chat.isGroup ? (
              <Hash className="w-6 h-6" />
            ) : (
              chatName ? getInitials(chatName) : 'DM'
            )}
          </div>
        )}
        
        {/* Online indicator for DMs */}
        {!chat.isGroup && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        )}
        
        {/* Group indicator */}
        {chat.isGroup && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-600 border-2 border-white rounded-full flex items-center justify-center">
            <Users className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-semibold truncate ${
            isActive ? 'text-blue-900' : 'text-slate-900'
          } ${
            chat.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'
          }`}>
            {chat.isGroup && <Hash className="w-4 h-4 inline mr-1" />}
            {chatName}
          </h3>
          
          {chat.lastMessage && (
            <div className="flex items-center space-x-1">
              {/* Message status for own messages */}
              {chat.lastMessage.sender?.name === 'You' && (
                <div className={`${
                  chat.lastMessage.status === 'read' ? 'text-blue-500' : 'text-slate-400'
                }`}>
                  {chat.lastMessage.status === 'read' ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </div>
              )}
              
              <span className={`text-xs ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {formatTime(chat.lastMessage.createdAt)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            {chat.lastMessage?.attachments?.length > 0 && (
              <Paperclip className="w-3 h-3 text-slate-400 mr-1 flex-shrink-0" />
            )}
            
            <p className={`text-sm truncate ${
              chat.unreadCount > 0 
                ? 'text-slate-900 font-medium' 
                : isActive 
                  ? 'text-blue-700' 
                  : 'text-slate-500'
            }`}>
              {getLastMessagePreview()}
            </p>
          </div>
          
          {/* Unread badge */}
          {chat.unreadCount > 0 && (
            <div className="ml-2 flex-shrink-0">
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full shadow-sm">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            </div>
          )}
        </div>
        
        {/* Group members preview for groups */}
        {chat.isGroup && chat.members && chat.members.length > 0 && (
          <div className="flex items-center mt-1">
            <Users className="w-3 h-3 text-slate-400 mr-1" />
            <span className="text-xs text-slate-400">
              {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      {/* Hover actions */}
      <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
        isActive ? 'opacity-100' : ''
      }`}>
        <div className="flex items-center space-x-1">
          {/* Add any additional actions here like pin, mute, etc. */}
        </div>
      </div>
      
      {/* Active indicator line */}
      {isActive && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-full"></div>
      )}
    </div>
  );
}