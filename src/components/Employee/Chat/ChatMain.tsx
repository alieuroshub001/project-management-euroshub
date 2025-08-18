import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { IChatDocument, IMessage } from '@/types/chat';
// IApiResponse not needed here
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import ChatHeader from './ChatHeader';
import { fetchApi } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';

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
  const fetchChats = async (showLoading = false) => {
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
  };

  // Initial fetch
  useEffect(() => {
    if (session?.user) {
      console.log('Session available, fetching chats');
      fetchChats(true);
    }
  }, [session?.user]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Refresh event received');
      fetchChats(false);
    };

    window.addEventListener('refreshChats', handleRefresh);
    return () => window.removeEventListener('refreshChats', handleRefresh);
  }, [session]);

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

  const refreshChats = () => {
    console.log('Manual refresh triggered');
    fetchChats(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchChats(true);
            }} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentChat = Array.isArray(chats)
    ? chats.find((chat) => chat._id === activeChat)
    : undefined;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow">
      <ChatSidebar 
        chats={chats} 
        activeChat={activeChat} 
        onSelectChat={handleChatSelect}
        onRefresh={refreshChats}
      />

      <div className="flex flex-col flex-1 border-l">
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">
                {chats.length === 0 
                  ? 'No chats available. Create a new chat to get started!' 
                  : 'Select a chat to start messaging'
                }
              </p>
              {chats.length === 0 && (
                <button 
                  onClick={refreshChats}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Refresh Chats
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs max-w-xs">
          <div>Session: {session?.user?.email}</div>
          <div>Chats: {chats.length}</div>
          <div>Active: {activeChat}</div>
          <div>Messages: {messages.length}</div>
          <div>Socket: {isConnected ? 'Connected' : 'Disconnected'}</div>
        </div>
      )}
    </div>
  );
}