import { IChatDocument } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

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
      return `${chat.lastMessage.sender?.name || 'Someone'} sent an attachment`;
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

  return (
    <div
      className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${isActive ? 'bg-blue-50' : ''}`}
      onClick={onClick}
    >
      <div className="mr-3">
        {getAvatarProps().src ? (
          <Image
            src={getAvatarProps().src as string}
            alt={(getAvatarProps().alt as string) || 'Chat'}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <h3 className="font-medium truncate">{getChatName()}</h3>
          {chat.lastMessage && (
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{getLastMessagePreview()}</p>
        {chat.unreadCount > 0 && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {chat.unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}