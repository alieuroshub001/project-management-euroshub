import { IAttachment } from '@/types/chat'; // ✅ Import from chat types instead of index
import Image from 'next/image';
import { ExternalLink, FileText } from 'lucide-react';

interface AttachmentPreviewProps {
  attachment: IAttachment;
}

export default function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const getPreviewComponent = () => {
    switch (attachment.type) {
      case 'image':
        return (
          <div className="relative group">
            <Image 
              src={attachment.url}
              alt={attachment.name}
              width={512}
              height={384}
              className="max-w-full max-h-64 rounded-lg object-cover shadow-sm border border-slate-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg"></div>
          </div>
        );
        
      case 'video':
        return (
          <video controls className="max-w-full max-h-64 rounded-lg shadow-sm border border-slate-200">
            <source src={attachment.url} type={`video/${attachment.format}`} />
            Your browser does not support the video tag.
          </video>
        );
        
      case 'audio':
        return (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <audio controls className="w-full">
              <source src={attachment.url} type={`audio/${attachment.format}`} />
              Your browser does not support the audio element.
            </audio>
            <div className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{attachment.name}</span>
              <span className="ml-2 text-slate-400">
                {(attachment.bytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        );
        
      case 'link':
        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow duration-200">
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-start space-x-3 group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 truncate">
                  {attachment.name || 'Link'}
                </h4>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                  Click to open external link
                </p>
                <p className="text-xs text-blue-600 mt-1 truncate">
                  {attachment.url}
                </p>
              </div>
            </a>
          </div>
        );
        
      case 'document':
      default:
        return (
          <div className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow duration-200 group">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-slate-200 transition-colors duration-200 rounded-lg flex items-center justify-center">
                  {attachment.format ? (
                    <span className="text-xs font-bold text-slate-600 uppercase">
                      {attachment.format}
                    </span>
                  ) : (
                    <FileText className="w-6 h-6 text-slate-500" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors duration-200">
                  {attachment.name}
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-slate-500">
                    {(attachment.bytes / 1024).toFixed(1)} KB
                  </span>
                  {attachment.format && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm text-slate-500 uppercase">
                        {attachment.format}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <a 
                  href={attachment.url} 
                  download={attachment.name}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200"
                >
                  Download
                </a>
              </div>
            </div>
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