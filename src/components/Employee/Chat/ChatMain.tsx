import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { IChatDocument, IMessage } from '@/types/chat';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import ChatHeader from './ChatHeader';
import { fetchApi } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Loader2, MessageCircle, RefreshCw } from 'lucide-react';

export default function ChatMain() {
  const { data: session } = useSession();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chats, setChats] = useState<IChatDocument[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      console.log('Raw chats response:', response);
      
      if (response.success && response.data) {
        const chatArray = Array.isArray(response.data) ? response.data : [];
        console.log('Processed chats:', chatArray.length, 'chats');
        setChats(chatArray);
        
        // Auto-select first chat if none is selected and we have chats
        if (chatArray.length > 0 && !activeChat) {
          console.log('Auto-selecting first chat:', chatArray[0]._id);
          setActiveChat(chatArray[0]._id);
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
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for chat:', activeChat);
        const response = await fetchApi<{ chat: IChatDocument; messages: IMessage[] }>(
          `/api/chat/${activeChat}`
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
    };

    fetchMessages();
  }, [activeChat]);

  /** Polling fallback for new messages */
  useEffect(() => {
    if (!activeChat) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const response = await fetchApi<{ chat: IChatDocument; messages: IMessage[] }>(
          `/api/chat/${activeChat}`
        );
        if (response.success && response.data) {
          const msgs = Array.isArray(response.data.messages) ? response.data.messages : [];
          setMessages(msgs);
        }
      } catch {}
    };
    timer = setInterval(poll, 5000);
    return () => { if (timer) clearInterval(timer); };
  }, [activeChat]);

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
        // Don't add message here if using socket - let socket handle it
        if (!socket || !isConnected) {
          setMessages((prev) => [...prev, response.data]);
        }
      } else {
        console.error('Failed to send message:', response.message);
        setError('Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  };

  const refreshChats = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchChats(false);
  }, [fetchChats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-red-50">
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden m-4">
        <ChatSidebar 
          chats={chats} 
          activeChat={activeChat} 
          onSelectChat={handleChatSelect}
          onRefresh={refreshChats}
        />

        <div className="flex flex-col flex-1 border-l border-slate-200">
          {currentChat ? (
            <>
              <ChatHeader chat={currentChat} />
              <ChatWindow
                chatId={activeChat}
                messages={messages}
                onSendMessage={handleSendMessage}
                messagesEndRef={messagesEndRef}
              />
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

      {/* Socket Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          isConnected 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {isConnected ? 'Connected' : 'Disconnected'}
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
          <div>Socket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
        </div>
      )}
    </div>
  );
}