import { useState } from 'react';
import { IChatDocument } from '@/types/chat';
import { Plus, Search, RefreshCw, Users, Hash, MessageCircle, Clock } from 'lucide-react';
import ChatListItem from './ChatListitem';
import NewChatModal from './NewChatModal';

interface ChatSidebarProps {
  chats: IChatDocument[];
  activeChat: string | null;
  onSelectChat: (chatId: string) => void;
  onRefresh?: () => void;
}

export default function ChatSidebar({ chats, activeChat, onSelectChat, onRefresh }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'channels' | 'dms'>('all');

  // Ensure chats is always an array
  const safeChats = Array.isArray(chats) ? chats : [];

  const filteredChats = safeChats.filter(chat => {
    const matchesSearch = chat.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         chat.participants?.some(p => 
                           typeof p === 'object' && p.name?.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    if (activeTab === 'channels') return chat.isGroup && matchesSearch;
    if (activeTab === 'dms') return !chat.isGroup && matchesSearch;
    return matchesSearch;
  });

  // Sort chats by last message time
  const sortedChats = filteredChats.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const handleNewChatClose = () => {
    setShowNewChatModal(false);
    // Refresh chats when modal closes (in case a new chat was created)
    if (onRefresh) {
      setTimeout(onRefresh, 500); // Small delay to ensure the chat is created
    }
  };

  const totalUnread = safeChats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);

  return (
    <div className="w-80 flex flex-col bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Messages
            </h1>
            {totalUnread > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all duration-200 hover:scale-105"
                title="Refresh chats"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-slate-700 placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'all' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <div className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              All ({safeChats.length})
            </div>
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'channels' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => setActiveTab('channels')}
          >
            <div className="flex items-center justify-center">
              <Hash className="w-4 h-4 mr-1" />
              Channels ({safeChats.filter(c => c.isGroup).length})
            </div>
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'dms' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => setActiveTab('dms')}
          >
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-1" />
              DMs ({safeChats.filter(c => !c.isGroup).length})
            </div>
          </button>
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              {searchTerm ? (
                <Search className="w-8 h-8 text-slate-400" />
              ) : (
                <MessageCircle className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {searchTerm ? 'No results found' : 'No conversations'}
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {searchTerm 
                ? 'Try searching with different keywords' 
                : 'Start a new conversation to get connected'
              }
            </p>
            {!searchTerm && (
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedChats.map(chat => (
              <ChatListItem
                key={chat._id}
                chat={chat}
                isActive={chat._id === activeChat}
                onClick={() => onSelectChat(chat._id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Activity Indicator */}
      {safeChats.length > 0 && (
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center text-xs text-slate-500">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
      
      <NewChatModal 
        isOpen={showNewChatModal} 
        onClose={handleNewChatClose}
      />
    </div>
  );
}