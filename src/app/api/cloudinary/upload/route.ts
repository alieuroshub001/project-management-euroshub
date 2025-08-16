// ./src/app/api/cloudinary/upload/route.ts - FIXED VERSION
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Server-only config (Node SDK)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// File type validation
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `File type ${file.type} is not allowed. Supported types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, WebP` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
        },
        { status: 400 }
      );
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Better format detection
    const getFileFormat = (filename: string, mimeType: string): string => {
      const mimeToFormat: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt',
        'application/rtf': 'rtf'
      };

      if (mimeToFormat[mimeType]) {
        return mimeToFormat[mimeType];
      }
      
      // Fallback to file extension
      const lastDot = filename.lastIndexOf('.');
      return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : 'unknown';
    };

    // Determine resource type and format
    const isImage = file.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    const detectedFormat = getFileFormat(file.name, file.type);

    // Clean filename for public_id
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();

    // FIXED: Proper upload options that ensure public access
    const uploadOptions = {
      folder: `${folder}/${session.user.id}`,
      resource_type: resourceType as 'image' | 'raw',
      public_id: `${timestamp}-${cleanFileName}`,
      
      // CRITICAL FIXES for public access:
      type: 'upload', // Standard upload type
      access_mode: 'public', // Ensure public access
      
      // For raw files, don't set format in upload options - let Cloudinary detect it
      use_filename: false,
      unique_filename: false,
      overwrite: false,
      
      // Additional options for better compatibility
      invalidate: true, // Clear CDN cache
      notification_url: undefined, // Don't use notification URLs
    };

    console.log('Upload options:', uploadOptions);

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (err?: UploadApiErrorResponse, res?: UploadApiResponse) => {
          if (err) {
            console.error('Cloudinary upload error:', err);
            return reject(err);
          }
          if (!res) {
            console.error('Empty Cloudinary response');
            return reject(new Error('Empty Cloudinary response'));
          }
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    // FIXED: Generate proper URLs using Cloudinary's URL helper
    const generateUrls = (uploadResult: UploadApiResponse) => {
      const publicId = uploadResult.public_id;
      
      if (resourceType === 'raw') {
        // For documents (PDFs, DOCs, etc.) - use Cloudinary's URL helper
        const baseUrl = cloudinary.url(publicId, {
          resource_type: 'raw',
          type: 'upload',
          secure: true,
        });
        
        // Generate different URL variations
        const viewUrl = baseUrl; // Direct URL for viewing
        
        // Download URL with attachment flag
        const downloadUrl = cloudinary.url(publicId, {
          resource_type: 'raw',
          type: 'upload',
          secure: true,
          flags: `attachment:${encodeURIComponent(file.name)}`
        });
        
        return {
          secure_url: baseUrl,
          url: baseUrl,
          view_url: viewUrl,
          download_url: downloadUrl
        };
      } else {
        // For images - use the direct URLs from Cloudinary response
        const baseUrl = uploadResult.secure_url || uploadResult.url;
        return {
          secure_url: baseUrl,
          url: uploadResult.url,
          view_url: baseUrl,
          download_url: baseUrl
        };
      }
    };

    const urls = generateUrls(result);

    console.log('Upload successful:', {
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format || detectedFormat,
      bytes: result.bytes,
      urls
    });

    // IMPROVED: Test URL accessibility with better error handling
    if (resourceType === 'raw') {
      console.log('Testing PDF URL accessibility...');
      try {
        const testResponse = await fetch(urls.secure_url, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'CloudinaryTest/1.0'
          }
        });
        console.log('PDF URL test status:', testResponse.status);
        
        if (testResponse.status === 401) {
          console.warn('PDF returned 401 - trying alternative URL generation...');
          
          // Alternative URL generation without signed URLs
          const alternativeUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${result.public_id}`;
          console.log('Trying alternative URL:', alternativeUrl);
          
          const altTestResponse = await fetch(alternativeUrl, { method: 'HEAD' });
          console.log('Alternative URL test status:', altTestResponse.status);
          
          if (altTestResponse.ok) {
            // Use the alternative URL if it works
            urls.secure_url = alternativeUrl;
            urls.url = alternativeUrl;
            urls.view_url = alternativeUrl;
          }
        } else if (!testResponse.ok) {
          console.warn('PDF URL test failed with status:', testResponse.status);
        } else {
          console.log('PDF URL is accessible');
        }
      } catch (testError) {
        console.warn('Could not test PDF URL:', testError);
        // Don't fail the upload just because we can't test the URL
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        public_id: result.public_id,
        secure_url: urls.secure_url,
        url: urls.url,
        view_url: urls.view_url,
        download_url: urls.download_url,
        original_filename: file.name,
        format: result.format || detectedFormat,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at,
        version: result.version,
        
        // Add file type info for frontend
        file_type: file.type,
        is_image: isImage,
        is_document: !isImage,
        
        // Add debug info
        cloudinary_response: process.env.NODE_ENV === 'development' ? {
          public_id: result.public_id,
          resource_type: result.resource_type,
          type: result.type,
          access_mode: result.access_mode
        } : undefined
      },
    });

  } catch (err: unknown) {
    console.error('Upload error:', err);

    let message = 'Upload failed';
    let statusCode = 500;

    if (err instanceof Error) {
      message = err.message;
      
      // Handle specific Cloudinary errors
      if (err.message.includes('File size too large')) {
        statusCode = 400;
        message = 'File size exceeds the allowed limit';
      } else if (err.message.includes('Invalid file type')) {
        statusCode = 400;
        message = 'Invalid file type';
      } else if (err.message.includes('Unauthorized')) {
        statusCode = 401;
        message = 'Unauthorized upload attempt';
      }
    }

    return NextResponse.json(
      { success: false, message, error: String(err) },
      { status: statusCode }
    );
  }
}

// Optional: Add DELETE endpoint for removing files
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json(
        { success: false, message: 'Missing public_id parameter' },
        { status: 400 }
      );
    }

    // Verify the file belongs to the current user (basic security check)
    if (!publicId.includes(session.user.id)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    // Try to delete from both resource types
    let result;
    try {
      // Try as raw first (for PDFs, docs)
      result = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'raw',
        type: 'upload' // Ensure we're deleting the right type
      });
    } catch {
      // Fallback to image
      result = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'image',
        type: 'upload'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      data: result
    });

  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to delete file' },
      { status: 500 }
    );
  }
}