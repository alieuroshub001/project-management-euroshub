import { useState } from 'react';
import { IChatDocument } from '@/types/chat';
import { FiPlus, FiSearch, FiRefreshCw } from 'react-icons/fi';
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

  const handleNewChatClose = () => {
    setShowNewChatModal(false);
    // Refresh chats when modal closes (in case a new chat was created)
    if (onRefresh) {
      setTimeout(onRefresh, 500); // Small delay to ensure the chat is created
    }
  };

  return (
    <div className="w-80 border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Chats</h2>
          <div className="flex space-x-2">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2 rounded-full hover:bg-gray-100"
                title="Refresh chats"
              >
                <FiRefreshCw className="text-gray-600" />
              </button>
            )}
            <button 
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-full hover:bg-gray-100"
              title="New chat"
            >
              <FiPlus className="text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2 mb-2">
          <button
            className={`px-3 py-1 text-sm rounded-full ${activeTab === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('all')}
          >
            All ({safeChats.length})
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${activeTab === 'channels' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('channels')}
          >
            Channels ({safeChats.filter(c => c.isGroup).length})
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${activeTab === 'dms' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('dms')}
          >
            DMs ({safeChats.filter(c => !c.isGroup).length})
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No chats match your search' : 'No chats found'}
            {!searchTerm && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Create your first chat
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredChats.map(chat => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={chat._id === activeChat}
              onClick={() => onSelectChat(chat._id)}
            />
          ))
        )}
      </div>
      
      <NewChatModal 
        isOpen={showNewChatModal} 
        onClose={handleNewChatClose}
      />
    </div>
  );
}