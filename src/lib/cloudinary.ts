//original
// src/lib/cloudinary.ts
// ✅ Browser-safe helpers. No Node SDK imports here.
// They call server API routes that use the Cloudinary Node SDK.

export type CloudinaryUploadResult = {
  asset_id?: string;
  public_id: string;
  secure_url: string;
  url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  created_at?: string;
  resource_type?: string;
} & Record<string, unknown>;

export async function uploadFileToCloudinary(
  file: File,
  folder: string = 'uploads'
): Promise<CloudinaryUploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);

  const res = await fetch('/api/cloudinary/upload', {
    method: 'POST',
    body: fd,
  });

  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || 'Cloudinary upload failed');
  }
  return json.data as CloudinaryUploadResult;
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const res = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId }),
  });

  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || 'Cloudinary delete failed');
  }
  return true;
}

export function getFileType(
  mimeType: string,
  extension?: string
): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  if (extension) {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'webm', 'flv', 'mkv', 'qt'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(ext)) return 'audio';
  }
  return 'document';
}
