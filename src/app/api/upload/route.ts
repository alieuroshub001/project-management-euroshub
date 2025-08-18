// app/api/upload/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToCloudinary, getFileType } from '@/lib/cloudinary1';
import { IApiResponse } from '@/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/quicktime',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mpeg',
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 
  'text/csv',
  'application/zip', 
  'application/x-rar-compressed',
  'application/x-zip-compressed',
  'application/octet-stream' // For some file types that might not have specific MIME types
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'No files provided'
      }, { status: 400 });
    }

    const uploadResults = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`File ${file.name} is too large. Maximum size is 50MB.`);
          continue;
        }

        // Check file size is not 0
        if (file.size === 0) {
          errors.push(`File ${file.name} is empty.`);
          continue;
        }

        // More flexible file type validation
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isAllowedType = ALLOWED_TYPES.includes(file.type) || 
          (file.type === 'application/octet-stream' && fileExtension && 
           ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'].includes(fileExtension));

        if (!isAllowedType) {
          errors.push(`File type ${file.type} for ${file.name} is not allowed.`);
          continue;
        }

        // Convert File to Buffer for Cloudinary upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) {
          errors.push(`File ${file.name} could not be read properly.`);
          continue;
        }

        // Determine resource type for Cloudinary
        let resourceType: 'image' | 'video' | 'raw' = 'raw'; // Default to raw for documents
        if (file.type.startsWith('image/')) {
          resourceType = 'image';
        } else if (file.type.startsWith('video/')) {
          resourceType = 'video';
        }

        // Upload to Cloudinary with proper configuration
        const result = await uploadToCloudinary(buffer, {
          folder: 'chat-uploads',
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          filename_override: file.name.replace(/\.[^/.]+$/, ""), // Remove extension, Cloudinary will add it back
        });
        
        uploadResults.push({
          public_id: result.public_id,
          secure_url: result.secure_url,
          original_filename: file.name, // Use the original filename from the File object
          format: result.format || fileExtension || 'unknown',
          bytes: result.bytes || file.size,
          type: getFileType(file.type, fileExtension),
          resource_type: result.resource_type
        });

      } catch (uploadError) {
        console.error('Upload error for file:', file.name, uploadError);
        errors.push(`Failed to upload ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
    }

    // If no files were uploaded successfully
    if (uploadResults.length === 0) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'No files were uploaded successfully',
        error: errors.join('; ')
      }, { status: 400 });
    }

    // If some files failed but others succeeded
    const response: IApiResponse = {
      success: true,
      data: uploadResults,
      message: `${uploadResults.length} file(s) uploaded successfully`
    };

    if (errors.length > 0) {
      response.message += `. ${errors.length} file(s) failed: ${errors.join('; ')}`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to upload files',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}