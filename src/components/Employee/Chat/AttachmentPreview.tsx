import { IAttachment } from '@/types';
import Image from 'next/image';

interface AttachmentPreviewProps {
  attachment: IAttachment;
}

export default function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const getPreviewComponent = () => {
    switch (attachment.type) {
      case 'image':
        return (
          <Image 
            src={attachment.url}
            alt={attachment.name}
            width={512}
            height={384}
            className="max-w-full max-h-64 rounded-lg object-cover"
          />
        );
      case 'video':
        return (
          <video controls className="max-w-full max-h-64 rounded-lg">
            <source src={attachment.url} type={`video/${attachment.format}`} />
            Your browser does not support the video tag.
          </video>
        );
      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={attachment.url} type={`audio/${attachment.format}`} />
            Your browser does not support the audio element.
          </audio>
        );
      default:
        return (
          <div className="flex items-center p-3 bg-gray-100 rounded-lg">
            <div className="mr-3">
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs">.{attachment.format}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{attachment.name}</p>
              <p className="text-xs text-gray-500">
                {(attachment.bytes / 1024).toFixed(1)} KB
              </p>
            </div>
            <a 
              href={attachment.url} 
              download={attachment.name}
              className="ml-3 text-blue-500 hover:text-blue-700"
            >
              Download
            </a>
          </div>
        );
    }
  };

  return (
    <div className="mt-2">
      {getPreviewComponent()}
    </div>
  );
}