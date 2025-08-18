import { IMessage } from '@/types/chat';
import Image from 'next/image';
import { format } from 'date-fns';
import { FiChevronDown } from 'react-icons/fi';
import AttachmentPreview from './AttachmentPreview';

interface MessageBubbleProps {
  message: IMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isCurrentUser = true; // Replace with actual user check

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div className="mr-2">
          {typeof message.sender === 'object' && (message.sender as { profileImage?: string })?.profileImage ? (
            <Image
              src={(message.sender as { profileImage?: string }).profileImage as string}
              alt={(message.sender as { name?: string }).name || 'User'}
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200" />
          )}
        </div>
      )}
      
      <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'} rounded-lg p-3`}>
        {message.replyTo && (
          <div className="text-xs text-gray-500 border-l-2 border-gray-300 pl-2 mb-2">
            Replying to: {typeof message.replyTo === 'object' ? ((message.replyTo as { content?: string }).content || 'message') : 'message'}
          </div>
        )}
        
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.attachments?.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment, index) => (
              <AttachmentPreview key={index} attachment={attachment} />
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-end mt-1 space-x-2 text-xs text-gray-500">
          <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
          {isCurrentUser && (
            <span className="text-blue-500">
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : ''}
            </span>
          )}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="ml-2 flex items-end">
          <button className="text-gray-400 hover:text-gray-600">
            <FiChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}