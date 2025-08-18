import { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(users.length > 0);
    
    if (users.length > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [users]);

  if (!visible) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="ml-2 text-sm text-gray-500">
          {users.length > 1 ? 'Several people are typing...' : 'Someone is typing...'}
        </span>
      </div>
    </div>
  );
}