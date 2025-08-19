import { IMessage } from '@/types/chat';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  Reply, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Forward,
  Pin,
  Bookmark,
  Download
} from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: IMessage;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onReply?: (message: IMessage) => void;
}

export default function MessageBubble({ message, onDelete, onEdit, onReply }: MessageBubbleProps) {
  const { data: session } = useSession();
  const [showActions, setShowActions] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showDropdown, setShowDropdown] = useState(false);

  // Determine if this message is from the current user
  const isCurrentUser = typeof message.sender === 'object' 
    ? (message.sender as { _id?: string; email?: string })._id === session?.user?.id ||
      (message.sender as { _id?: string; email?: string }).email === session?.user?.email
    : false;
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handleCopyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    }
    setShowDropdown(false);
  };

  const handleDeleteMessage = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      if (typeof message._id === 'string') {
        onDelete?.(message._id);
      } else {
        toast.error('Invalid message id');
      }
    }
    setShowDropdown(false);
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      if (typeof message._id === 'string') {
        onEdit?.(message._id, editContent.trim());
      } else {
        toast.error('Invalid message id');
      }
      setShowEditInput(false);
    } else {
      setShowEditInput(false);
    }
  };

  const handleEditCancel = () => {
    setEditContent(message.content || '');
    setShowEditInput(false);
  };

  const handleReplyToMessage = () => {
    onReply?.(message);
    setShowDropdown(false);
  };

  const handleForwardMessage = () => {
    // TODO: Implement forward functionality
    toast.info('Forward feature coming soon');
    setShowDropdown(false);
  };

  const handlePinMessage = () => {
    // TODO: Implement pin functionality
    toast.info('Pin feature coming soon');
    setShowDropdown(false);
  };

  const handleBookmarkMessage = () => {
    // TODO: Implement bookmark functionality
    toast.success('Message bookmarked');
    setShowDropdown(false);
  };

  const handleDownloadAttachments = () => {
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach((attachment, index) => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name || `attachment-${index}`;
        link.target = '_blank';
        link.click();
      });
      toast.success(`Downloaded ${message.attachments.length} file(s)`);
    }
    setShowDropdown(false);
  };

  return (
    <div className={`flex group ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for other users */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-3">
            {typeof message.sender === 'object' && (message.sender as { profileImage?: string })?.profileImage ? (
              <Image
                src={(message.sender as { profileImage?: string }).profileImage as string}
                alt={(message.sender as { name?: string }).name || 'User'}
                width={32}
                height={32}
                className="rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                {typeof message.sender === 'object' && (message.sender as { name?: string }).name 
                  ? getInitials((message.sender as { name?: string }).name as string)
                  : 'U'
                }
              </div>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <div 
          className="relative"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg border-l-3 bg-slate-50 ${
              isCurrentUser ? 'border-l-blue-300' : 'border-l-slate-300'
            }`}>
              <div className="flex items-center mb-1">
                <Reply className="w-3 h-3 text-slate-400 mr-1" />
                <span className="text-xs font-medium text-slate-600">
                  Replying to {typeof message.replyTo === 'object' ? 
                    ((message.replyTo as { sender?: { name?: string } }).sender?.name || 'someone') : 
                    'message'
                  }
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {typeof message.replyTo === 'object' ? 
                  ((message.replyTo as { content?: string }).content || 'message') : 
                  'message'
                }
              </p>
            </div>
          )}
          
          {/* Main message bubble */}
          <div className={`relative rounded-2xl px-4 py-3 shadow-sm ${
            isCurrentUser 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
              : 'bg-white border border-slate-200 text-slate-800'
          } ${
            message.content || message.attachments?.length ? '' : 'hidden'
          }`}>
            {/* Sender name for group chats */}
            {!isCurrentUser && typeof message.sender === 'object' && (message.sender as { name?: string }).name && (
              <div className="text-xs font-semibold text-blue-600 mb-1">
                {(message.sender as { name?: string }).name}
              </div>
            )}
            
            {/* Message text or edit input */}
            {showEditInput && isCurrentUser ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 text-slate-800 bg-white border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={Math.min(editContent.split('\n').length + 1, 5)}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleEditCancel}
                    className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              message.content && (
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                  {message.edited && (
                    <span className={`text-xs ml-2 ${isCurrentUser ? 'text-blue-100' : 'text-slate-400'}`}>
                      (edited)
                    </span>
                  )}
                </div>
              )
            )}
            
            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className={`${message.content ? 'mt-3' : ''} space-y-2`}>
                {message.attachments.map((attachment, index) => (
                  <AttachmentPreview key={index} attachment={attachment} />
                ))}
              </div>
            )}
            
            {/* Message time and status */}
            <div className={`flex items-center justify-end mt-2 space-x-1 text-xs ${
              isCurrentUser ? 'text-blue-100' : 'text-slate-500'
            }`}>
              <span className="select-none">
                {formatMessageTime(
                  typeof message.createdAt === 'string'
                    ? message.createdAt
                    : message.createdAt.toISOString()
                )}
              </span>
              
              {/* Message status for current user */}
              {isCurrentUser && (
                <div className="flex items-center">
                  {message.status === 'read' ? (
                    <CheckCheck className="w-4 h-4 text-blue-200" />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-4 h-4 text-blue-300" />
                  ) : (
                    <Check className="w-4 h-4 text-blue-300" />
                  )}
                </div>
              )}
            </div>
            
            {/* Message tail */}
            <div className={`absolute top-3 ${
              isCurrentUser 
                ? '-right-1 border-l-8 border-l-blue-500 border-t-8 border-t-transparent border-b-8 border-b-transparent' 
                : '-left-1 border-r-8 border-r-white border-t-8 border-t-transparent border-b-8 border-b-transparent'
            } w-0 h-0`}></div>
          </div>
          
          {/* Message actions (hover) */}
          {showActions && !showEditInput && (
            <div className={`absolute top-0 ${
              isCurrentUser ? '-left-12' : '-right-12'
            } flex items-center space-x-1 bg-white shadow-lg border border-slate-200 rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}>
              <button 
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                onClick={handleReplyToMessage}
                title="Reply"
              >
                <Reply className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button 
                  className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowDropdown(!showDropdown)}
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      onClick={handleCopyMessage}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy message
                    </button>
                    
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      onClick={handleForwardMessage}
                    >
                      <Forward className="w-4 h-4 mr-2" />
                      Forward
                    </button>
                    
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      onClick={handleBookmarkMessage}
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      Bookmark
                    </button>
                    
                    <button 
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      onClick={handlePinMessage}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      Pin message
                    </button>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <button 
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                        onClick={handleDownloadAttachments}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download files
                      </button>
                    )}
                    
                    <div className="border-t border-slate-100 my-1"></div>
                    
                    {isCurrentUser && (
                      <button 
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                        onClick={() => {
                          setShowEditInput(true);
                          setShowDropdown(false);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit message
                      </button>
                    )}
                    
                    {isCurrentUser && (
                      <button 
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        onClick={handleDeleteMessage}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete message
                      </button>
                    )}
                  </div>
                )}
              </div>
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