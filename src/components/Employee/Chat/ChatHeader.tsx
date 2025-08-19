import { IChatDocument } from '@/types/chat';
import Image from 'next/image';
import { 
  MoreVertical, 
  Users, 
  Star, 
  Info, 
  Hash,
  Search,
  Settings,
  Bell,
  BellOff,
  UserMinus,
  Download,
  Archive,
  Bookmark,
  Shield,
  Pin,
  UserPlus
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

interface ChatHeaderProps {
  chat: IChatDocument;
  onLeaveChat?: () => void;
}

export default function ChatHeader({ chat, onLeaveChat }: ChatHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [, setShowMediaModal] = useState(false);

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
        typeof p === 'object' && (p as unknown as { _id?: string })._id !== creatorId
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

  const handleMuteToggle = async () => {
    try {
      const response = await fetchApi(`/api/chat/${chat._id}`, {
        method: 'PUT',
        body: { 
          notificationsEnabled: isMuted,
          muteUntil: !isMuted ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null 
        }
      });

      if (response.success) {
        setIsMuted(!isMuted);
        toast.success(isMuted ? 'Notifications enabled' : 'Chat muted for 24 hours');
      } else {
        toast.error('Failed to update notification settings');
      }
    } catch {
      toast.error('Failed to update notification settings');
    }
    setShowDropdown(false);
  };

  const handleStarToggle = async () => {
    try {
      const response = await fetchApi(`/api/chat/${chat._id}`, {
        method: 'PUT',
        body: { isFavorite: !isStarred }
      });

      if (response.success) {
        setIsStarred(!isStarred);
        toast.success(isStarred ? 'Removed from favorites' : 'Added to favorites');
      } else {
        toast.error('Failed to update favorite status');
      }
    } catch  {
      toast.error('Failed to update favorite status');
    }
    setShowDropdown(false);
  };

  const handlePinToggle = () => {
    setIsPinned(!isPinned);
    toast.success(isPinned ? 'Chat unpinned' : 'Chat pinned');
    setShowDropdown(false);
  };

  const handleExportChat = async () => {
    try {
      toast.info('Preparing chat export...');
      const response = await fetchApi(`/api/chat/${chat._id}/export`);
      
      if (response.success && response.data) {
        // Create downloadable file
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chat.name || 'chat'}-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success('Chat exported successfully');
      } else {
        toast.error('Failed to export chat');
      }
    } catch  {
      toast.error('Failed to export chat');
    }
    setShowDropdown(false);
  };

  const handleDownloadMedia = async () => {
    try {
      toast.info('Fetching media files...');
      const response = await fetchApi(`/api/chat/${chat._id}/media`);
      
      if (response.success && Array.isArray(response.data)) {
        setShowMediaModal(true);
        toast.success(`Found ${response.data.length} media files`);
      } else {
        toast.error('No media files found');
      }
    } catch  {
      toast.error('Failed to fetch media files');
    }
    setShowDropdown(false);
  };

  const handleArchiveChat = async () => {
    try {
      const response = await fetchApi(`/api/chat/${chat._id}/archive`, {
        method: 'POST'
      });

      if (response.success) {
        toast.success('Chat archived successfully');
      } else {
        toast.error('Failed to archive chat');
      }
    } catch  {
      toast.error('Failed to archive chat');
    }
    setShowDropdown(false);
  };

  const avatarProps = getAvatarProps();
  const chatName = chat.name || firstParticipantName;

  return (
    <div className="flex items-center justify-between h-[88px] px-6 bg-white border-b border-slate-200 shadow-sm">
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

          {/* Pinned indicator */}
          {isPinned && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 border-2 border-white rounded-full shadow-sm flex items-center justify-center">
              <Pin className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        {/* Chat Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            {chat.isGroup && <Hash className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />}
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {chatName}
            </h1>
            {isStarred && <Star className="w-4 h-4 text-yellow-500 ml-2 flex-shrink-0 fill-current" />}
            {isMuted && <BellOff className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />}
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

        {/* Star */}
        <button 
          className={`p-2 rounded-full transition-all duration-200 hover:scale-105 ${
            isStarred 
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
              : 'hover:bg-slate-100 text-slate-500 hover:text-yellow-500'
          }`}
          onClick={handleStarToggle}
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
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={handleMuteToggle}
              >
                {isMuted ? <Bell className="w-4 h-4 mr-3" /> : <BellOff className="w-4 h-4 mr-3" />}
                {isMuted ? 'Unmute notifications' : 'Mute notifications'}
              </button>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={handlePinToggle}
              >
                <Pin className="w-4 h-4 mr-3" />
                {isPinned ? 'Unpin chat' : 'Pin chat'}
              </button>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={() => setShowMembersModal(true)}
              >
                <Info className="w-4 h-4 mr-3" />
                Chat info
              </button>
              
              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                <Search className="w-4 h-4 mr-3" />
                Search messages
              </button>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={handleDownloadMedia}
              >
                <Download className="w-4 h-4 mr-3" />
                Download media files
              </button>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={handleExportChat}
              >
                <Archive className="w-4 h-4 mr-3" />
                Export chat
              </button>
              
              {chat.isGroup && (
                <>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                    <UserPlus className="w-4 h-4 mr-3" />
                    Add members
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                    <Settings className="w-4 h-4 mr-3" />
                    Group settings
                  </button>
                </>
              )}
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                onClick={handleArchiveChat}
              >
                <Bookmark className="w-4 h-4 mr-3" />
                Archive chat
              </button>
              
              <div className="border-t border-slate-100 my-1"></div>
              
              {chat.isGroup && onLeaveChat && (
                <button 
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  onClick={() => {
                    setShowDropdown(false);
                    if (window.confirm('Are you sure you want to leave this group?')) {
                      onLeaveChat();
                    }
                  }}
                >
                  <UserMinus className="w-4 h-4 mr-3" />
                  Leave group
                </button>
              )}
              
              {!chat.isGroup && (
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center">
                  <Shield className="w-4 h-4 mr-3" />
                  Block user
                </button>
              )}
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

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Chat Information</h3>
              <button 
                onClick={() => setShowMembersModal(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="text-center mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-3 ${
                  chat.isGroup 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                  {chat.isGroup ? (
                    <Hash className="w-8 h-8" />
                  ) : (
                    chatName ? getInitials(chatName) : 'DM'
                  )}
                </div>
                <h4 className="text-xl font-semibold text-slate-900">{chatName}</h4>
                <p className="text-slate-600">{getParticipantNames()}</p>
              </div>
              
              {chat.description && (
                <div className="mb-4">
                  <h5 className="font-medium text-slate-900 mb-2">Description</h5>
                  <p className="text-slate-600 text-sm">{chat.description}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Created</span>
                  <span className="text-slate-900">{new Date(chat.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Type</span>
                  <span className="text-slate-900">{chat.isGroup ? 'Group Chat' : 'Direct Message'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Privacy</span>
                  <span className="text-slate-900">{chat.isPrivate ? 'Private' : 'Public'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}