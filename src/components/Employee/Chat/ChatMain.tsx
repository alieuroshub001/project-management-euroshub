import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { IChatDocument, IMessage } from '@/types/chat';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import ChatHeader from './ChatHeader';
import { fetchApi } from '@/lib/api';
import { Loader2, MessageCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatMain() {
  const { data: session } = useSession();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chats, setChats] = useState<IChatDocument[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /** Fetch chats safely */
  const fetchChats = useCallback(async (showLoading = false) => {
    if (!session?.user) {
      console.log('No session available');
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching chats for user:', session.user.email);
      const response = await fetchApi<IChatDocument[]>('/api/chat');
      
      if (response.success && response.data) {
        const chatArray = Array.isArray(response.data) ? response.data : [];
        console.log('Processed chats:', chatArray.length, 'chats');
        setChats(chatArray);
        
        // Auto-select first chat if none is selected and we have chats
        if (chatArray.length > 0 && !activeChat) {
          console.log('Auto-selecting first chat:', chatArray[0]._id);
          setActiveChat(String(chatArray[0]._id));
        }
      } else {
        console.error('Failed to fetch chats:', response.message);
        setError(response.message || 'Failed to load chats');
        setChats([]);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      setError('Failed to connect to server');
      setChats([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [session?.user, activeChat]);

  // Online/Offline status
  useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    toast.success('Connection restored');
    fetchChats(false);
  };

  const handleOffline = () => {
    setIsOnline(false);
    toast.error('Connection lost');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [fetchChats]);

  // Initial fetch
  useEffect(() => {
    if (session?.user) {
      console.log('Session available, fetching chats');
      fetchChats(true);
    }
  }, [session?.user, fetchChats]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Refresh event received');
      fetchChats(false);
    };

    window.addEventListener('refreshChats', handleRefresh);
    return () => window.removeEventListener('refreshChats', handleRefresh);
  }, [session, fetchChats]);

  /** Fetch messages for the active chat */
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      console.log('Fetching messages for chat:', chatId);
      const response = await fetchApi<{ chat: IChatDocument; messages: IMessage[] }>(
        `/api/chat/${chatId}`
      );

      if (response.success && response.data) {
        const msgs = Array.isArray(response.data.messages) 
          ? response.data.messages 
          : [];
        console.log('Fetched messages:', msgs.length);
        setMessages(msgs);
      } else {
        console.error('Failed to fetch messages:', response.message);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      // Clear polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    fetchMessages(activeChat);

    // Start polling for new messages every 3 seconds when online
    if (isOnline) {
      pollingRef.current = setInterval(() => {
        fetchMessages(activeChat);
      }, 3000);
    }

    // Cleanup polling on chat change or component unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeChat, isOnline, fetchMessages]);

  /** Scroll to bottom on new messages */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleChatSelect = (chatId: string) => {
    if (chatId !== activeChat) {
      console.log('Selecting chat:', chatId);
      setActiveChat(chatId);
      setMessages([]); // Clear messages when switching chats
    }
  };

  const handleSendMessage = async (content: string, attachments: { url: string; type: 'image' | 'document'; name?: string; public_id?: string; secure_url?: string; format?: string; bytes?: number; resource_type?: string }[] = []) => {
    if (!activeChat || (!content?.trim() && attachments.length === 0)) return;

    try {
      console.log('Sending message:', { content, attachments: attachments.length });
      const response = await fetchApi<IMessage>(`/api/chat/${activeChat}`, {
        method: 'POST',
        body: { 
          content: content.trim(), 
          attachments: attachments.length > 0 ? attachments : undefined 
        },
      });

      if (response.success && response.data) {
        console.log('Message sent successfully');
        // Immediately add the message to state for instant feedback
        if (response.data) {
          if (response.data) {
            if (response.data) {
              if (response.data) {
                setMessages((prev) => [...prev, response.data as IMessage]);
              }
            }
          }
        }
        // Refresh chat list to update last message
        fetchChats(false);
      } else {
        console.error('Failed to send message:', response.message);
        toast.error('Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat) return;

    try {
      const response = await fetchApi(`/api/chat/${activeChat}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        // Remove message from state
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        toast.success('Message deleted');
      } else {
        toast.error('Failed to delete message');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Failed to delete message');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChat) return;

    try {
      const response = await fetchApi<IMessage>(`/api/chat/${activeChat}/messages/${messageId}`, {
        method: 'PUT',
        body: { content: newContent }
      });

      if (response.success && response.data) {
        // Update message in state
        setMessages(prev => prev.map(msg =>
          msg._id === messageId && response.data ? response.data : msg
        ));
        toast.success('Message updated');
      } else {
        toast.error('Failed to edit message');
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      toast.error('Failed to edit message');
    }
  };

  const handleLeaveChat = async (chatId: string) => {
    try {
      const response = await fetchApi(`/api/chat/${chatId}/leave`, {
        method: 'POST',
      });

      if (response.success) {
        // Remove chat from state and switch to another chat
        setChats(prev => prev.filter(chat => chat._id !== chatId));
        if (activeChat === chatId) {
          setActiveChat(null);
          setMessages([]);
        }
        toast.success('Left chat successfully');
      } else {
        toast.error('Failed to leave chat');
      }
    } catch (err) {
      console.error('Failed to leave chat:', err);
      toast.error('Failed to leave chat');
    }
  };

  const refreshChats = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchChats(false);
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [fetchChats, activeChat, fetchMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
          <div className="relative mb-6">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-100 rounded-full mx-auto"></div>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Loading Your Chats</h3>
          <p className="text-slate-600">Please wait while we fetch your conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Connection Error</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchChats(true);
            }} 
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentChat = Array.isArray(chats)
    ? chats.find((chat) => chat._id === activeChat)
    : undefined;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Chat Container with Fixed Height Structure */}
      <div className="flex w-full h-full bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Sidebar - Fixed Width and Full Height */}
        <div className="flex-shrink-0 w-80">
          <ChatSidebar 
            chats={chats} 
            activeChat={activeChat} 
            onSelectChat={handleChatSelect}
            onRefresh={refreshChats}
          />
        </div>

        {/* Main Chat Area - Full Height with Flex Layout */}
        <div className="flex flex-col flex-1 min-w-0 border-l border-slate-200">
          {currentChat ? (
            <>
              {/* Fixed Header */}
              <div className="flex-shrink-0">
                <ChatHeader 
                  chat={currentChat} 
                  onLeaveChat={() => handleLeaveChat(String(currentChat._id))}
                />
              </div>
              
              {/* Scrollable Chat Window - Takes remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatWindow
                  chatId={activeChat ?? ''}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  messagesEndRef={messagesEndRef}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-b from-slate-50 to-white">
              <div className="text-center p-12 max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  {chats.length === 0 ? 'No Conversations Yet' : 'Select a Conversation'}
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {chats.length === 0 
                    ? 'Start your first conversation by creating a new chat or joining an existing one.' 
                    : 'Choose a conversation from the sidebar to start messaging.'
                  }
                </p>
                {chats.length === 0 && (
                  <button 
                    onClick={refreshChats}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Chats
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          isOnline 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {isOnline ? (
            <Wifi className="w-3 h-3 mr-2" />
          ) : (
            <WifiOff className="w-3 h-3 mr-2" />
          )}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg text-xs max-w-xs backdrop-blur-sm border border-slate-700">
          <div className="font-semibold mb-2 text-blue-400">Debug Info</div>
          <div>Session: {session?.user?.email}</div>
          <div>Chats: {chats.length}</div>
          <div>Active: {activeChat || 'None'}</div>
          <div>Messages: {messages.length}</div>
          <div>Online: {isOnline ? '✅ Connected' : '❌ Offline'}</div>
        </div>
      )}
    </div>
  );
}