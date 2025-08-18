'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Avatar } from 'antd';
import { FiUsers } from 'react-icons/fi';
import { fetchApi } from '@/lib/api';
import { IApiResponse } from '@/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IUser {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [chatType, setChatType] = useState<'channel' | 'dm'>('channel');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setFetchingUsers(true);
      setError(null);
      
      try {
        console.log('Fetching users...');
        const response = await fetchApi<IApiResponse<IUser[]>>('/api/users');
        console.log('Users response:', response);
        
        if (response.success && response.data) {
          const userData = Array.isArray(response.data) ? response.data : [];
          console.log('Processed user data:', userData);
          setUsers(userData);
        } else {
          console.error('Failed to fetch users - Response not successful:', response);
          setError(response.message || 'Failed to fetch users');
          setUsers([]);
        }
      } catch (err) {
        console.error('Failed to fetch users - Exception:', err);
        setError('Failed to fetch users');
        setUsers([]);
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPrivate(false);
    setSelectedUsers([]);
    setError(null);
    setChatType('channel');
  };

  const handleUserSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      if (chatType === 'dm' && selectedUsers.length >= 1) {
        // Replace the selected user for DM
        setSelectedUsers([userId]);
      } else {
        setSelectedUsers([...selectedUsers, userId]);
      }
    }
  };

  const validateForm = () => {
    if (chatType === 'channel') {
      if (!name.trim()) {
        setError('Channel name is required');
        return false;
      }
    } else {
      if (selectedUsers.length !== 1) {
        setError('Select exactly one user for direct message');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Creating chat with type:', chatType);
      
      let requestBody: { [key: string]: unknown };
      
      if (chatType === 'channel') {
        requestBody = {
          name: name.trim(),
          description: description.trim(),
          isPrivate,
          members: selectedUsers,
          isDirectMessage: false
        };
      } else {
        requestBody = {
          isDirectMessage: true,
          recipientId: selectedUsers[0]
        };
      }

      console.log('Request body:', requestBody);

      const response = await fetchApi<IApiResponse<any>>('/api/chat', {
        method: 'POST',
        body: requestBody,
      });

      console.log('Chat creation response:', response);

      if (response.success) {
        console.log('Chat created successfully');
        resetForm();
        onClose();
        // Trigger a refresh of the chat list
        window.dispatchEvent(new CustomEvent('refreshChats'));
      } else {
        console.error('Chat creation failed:', response.message);
        setError(response.message || 'Failed to create chat');
      }
    } catch (err) {
      console.error('Chat creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      title={chatType === 'channel' ? 'Create New Channel' : 'New Direct Message'}
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={
            fetchingUsers || 
            (chatType === 'channel' && !name.trim()) || 
            (chatType === 'dm' && selectedUsers.length !== 1)
          }
          onClick={handleSubmit}
        >
          {chatType === 'channel' ? 'Create Channel' : 'Start Chat'}
        </Button>,
      ]}
      destroyOnClose={true}
    >
      <div className="space-y-4">
        {/* Chat Type Selector */}
        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg transition-colors ${
              chatType === 'channel' 
                ? 'bg-blue-100 text-blue-600 border border-blue-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            onClick={() => {
              setChatType('channel');
              setSelectedUsers([]);
              setError(null);
            }}
            disabled={loading}
          >
            Channel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg transition-colors ${
              chatType === 'dm' 
                ? 'bg-blue-100 text-blue-600 border border-blue-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            onClick={() => {
              setChatType('dm');
              setSelectedUsers([]);
              setError(null);
            }}
            disabled={loading}
          >
            Direct Message
          </button>
        </div>

        {/* Channel Form */}
        {chatType === 'channel' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Channel Name *</label>
              <Input
                placeholder="Enter channel name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                maxLength={50}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input.TextArea
                placeholder="Optional channel description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={loading}
                maxLength={200}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="private"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mr-2"
                disabled={loading}
              />
              <label htmlFor="private" className="text-sm">
                Private channel (only invited members can join)
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Add Members</label>
              {fetchingUsers ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No users available to add
                </div>
              ) : (
                <Select
                  mode="multiple"
                  placeholder="Select members to add..."
                  style={{ width: '100%' }}
                  value={selectedUsers}
                  onChange={setSelectedUsers}
                  disabled={loading}
                  optionLabelProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {users.map(user => (
                    <Select.Option 
                      key={user._id} 
                      value={user._id} 
                      label={user.name}
                    >
                      <div className="flex items-center">
                        <Avatar 
                          src={user.profileImage} 
                          size="small" 
                          className="mr-2" 
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <span>{user.name}</span>
                        <span className="text-gray-400 text-xs ml-2">({user.email})</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              )}
            </div>
          </>
        )}

        {/* Direct Message Form */}
        {chatType === 'dm' && (
          <div>
            <label className="block text-sm font-medium mb-2">Select a user to message</label>
            {fetchingUsers ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users available for messaging
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {users.map(user => (
                  <div
                    key={user._id}
                    className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedUsers.includes(user._id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => !loading && handleUserSelect(user._id)}
                  >
                    <Avatar 
                      src={user.profileImage} 
                      alt={user.name} 
                      size="small" 
                      className="mr-3" 
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray-500 text-sm">{user.email}</div>
                    </div>
                    {selectedUsers.includes(user._id) && (
                      <div className="text-blue-500">
                        <FiUsers />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Debug Information (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
            <div>Users loaded: {users.length}</div>
            <div>Selected users: {selectedUsers.length}</div>
            <div>Chat type: {chatType}</div>
            {chatType === 'channel' && <div>Channel name: "{name}"</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}