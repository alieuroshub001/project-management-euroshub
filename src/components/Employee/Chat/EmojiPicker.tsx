'use client';

import { useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function MyEmojiPicker({ onSelect, onClose }: Props) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    onClose();
  };

  return (
    <div ref={pickerRef}>
      <EmojiPicker onEmojiClick={handleEmojiClick} />
    </div>
  );
}
