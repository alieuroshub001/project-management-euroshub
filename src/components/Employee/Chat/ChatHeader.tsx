import { IChatDocument } from '@/types/chat';
import Avatar from '@/components/Dashboard/ProfileAvatar';
import { FiMoreVertical, FiUsers, FiStar } from 'react-icons/fi';

interface ChatHeaderProps {
  chat: IChatDocument;
}

export default function ChatHeader({ chat }: ChatHeaderProps) {
  const getParticipantNames = () => {
    if (chat.isGroup) {
      return `${chat.members.length} members`;
    }
    return chat.participants?.map(p => (p as any)?.name).join(', ') || '';
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        <div className="mr-3">
          <Avatar 
            src={chat.avatar || (chat.participants?.[0] as any)?.profileImage} 
            alt={chat.name || (chat.participants?.[0] as any)?.name} 
            size="md" 
          />
        </div>
        <div>
          <h2 className="font-semibold">{chat.name || (chat.participants?.[0] as any)?.name}</h2>
          <div className="flex items-center text-sm text-gray-500">
            {chat.isGroup ? (
              <>
                <FiUsers className="mr-1" />
                <span>{getParticipantNames()}</span>
              </>
            ) : (
              <span>Online</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-gray-500 hover:text-yellow-500">
          <FiStar />
        </button>
        <button className="text-gray-500 hover:text-gray-700">
          <FiMoreVertical />
        </button>
      </div>
    </div>
  );
}