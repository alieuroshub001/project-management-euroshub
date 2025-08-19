import { IChatDocument } from '@/types/chat';
import Image from 'next/image';
import { 
  MoreVertical, 
  Users, 
  Star, 
  Phone, 
  Video, 
  Info, 
  Hash,
  Search,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';
import { useState } from 'react';

interface ChatHeaderProps {
  chat: IChatDocument;
}

export default function ChatHeader({ chat }: ChatHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const getParticipantNames = () => {
    if (chat.isGroup) {
      return `${chat.members?.length || 0} members`;
    }
    return chat.participants?.map(p => (typeof p === 'object' ? (p as { name?: string }).name : '')).join(', ') || '';
  };

  const firstParticipantName =
    typeof chat.participants?.[0] === 'object'
      ? ((chat.participants?.[0] as { name?: string })?.name ?? 'Chat')
      : 'Chat';

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

  const avatarProps = getAvatarProps();
  const chatName = chat.name || firstParticipantName;

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center min-w-0 flex-1">
        {/* Avatar */}
        <div className="relative flex-shrink-0 mr-4">
          {avatarProps.src ? (
            <Image
              src={avatarProps.src}
              alt={avatarProps.alt || 'Chat'}
              width={44}
              height={44}
              className="rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md ${
              chat.isGroup 
                ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}>
              {chat.isGroup ? (
                <Hash className="w-5 h-5" />
              ) : (
                chatName ? getInitials(chatName) : 'DM'
              )}
            </div>
          )}
          
          {/* Online status for DMs */}
          {!chat.isGroup && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
          )}
        </div>

        {/* Chat Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            {chat.isGroup && <Hash className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />}
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {chatName}
            </h1>
            {isStarred && <Star className="w-4 h-4 text-yellow-500 ml-2 flex-shrink-0" />}
          </div>
          
          <div className="flex items-center text-sm text-slate-500 mt-1">
            {chat.isGroup ? (
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                <span>{getParticipantNames()}</span>
                {chat.members && chat.members.length > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="text-green-600 font-medium">
                      {Math.floor(Math.random() * chat.members.length) + 1} online
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium">Online</span>
                <span className="mx-2">•</span>
                <span>Last seen recently</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 ml-4">
        {/* Search */}
        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:scale-105">
          <Search className="w-5 h-5" />
        </button>

        {/* Voice Call */}
        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:scale-105">
          <Phone className="w-5 h-5" />
        </button>

        {/* Video Call */}
        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:scale-105">
          <Video className="w-5 h-5" />
        </button>

        {/* Star */}
        <button 
          className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
            isStarred 
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
              : 'hover:bg-slate-100 text-slate-500 hover:text-yellow-500'
          }`}
          onClick={() => setIsStarred(!isStarred)}
        >
          <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
        </button>

        {/* More Options Dropdown */}
        <div className="relative">
          <button 
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:scale-105"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={() => {
                  setIsMuted(!isMuted);
                  setShowDropdown(false);
                }}
              >
                {isMuted ? <Bell className="w-4 h-4 mr-3" /> : <BellOff className="w-4 h-4 mr-3" />}
                {isMuted ? 'Unmute notifications' : 'Mute notifications'}
              </button>
              
              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                <Info className="w-4 h-4 mr-3" />
                Chat info
              </button>
              
              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                <Search className="w-4 h-4 mr-3" />
                Search messages
              </button>
              
              {chat.isGroup && (
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                  <Settings className="w-4 h-4 mr-3" />
                  Group settings
                </button>
              )}
              
              <div className="border-t border-slate-100 my-1"></div>
              
              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center">
                <Users className="w-4 h-4 mr-3" />
                {chat.isGroup ? 'Leave group' : 'Block user'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </div>
  );
}