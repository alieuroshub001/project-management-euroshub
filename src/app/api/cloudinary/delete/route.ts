// ./src/app/api/cloudinary/delete/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary, UploadApiErrorResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type DestroyApiResponse = {
  result: 'ok' | 'not found' | string;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  try {
    const { publicId } = await req.json();
    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'publicId required' },
        { status: 400 }
      );
    }

    const res: DestroyApiResponse | UploadApiErrorResponse =
      await cloudinary.uploader.destroy(publicId);

    if ('result' in res && res.result !== 'ok' && res.result !== 'not found') {
      // 'not found' is fine for idempotency
      return NextResponse.json(
        { success: false, message: 'Delete failed', data: res },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted',
      data: res,
    });
  } catch (err: unknown) {
    console.error('Cloudinary delete error:', err);

    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Delete failed';

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
