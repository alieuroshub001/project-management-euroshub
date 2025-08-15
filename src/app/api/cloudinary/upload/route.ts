// ./src/app/api/cloudinary/upload/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Server-only config (Node SDK)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Missing file' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (err?: UploadApiErrorResponse, res?: UploadApiResponse) => {
          if (err) return reject(err);
          if (!res) return reject(new Error('Empty Cloudinary response'));
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: 'Uploaded',
      data: result,
    });
  } catch (err: unknown) {
    console.error('Cloudinary upload error:', err);

    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Upload failed';

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
