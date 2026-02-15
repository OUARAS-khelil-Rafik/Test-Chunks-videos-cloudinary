import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import User from '@/models/User';
import cloudinary, { applyCloudinaryConfig, setCurrentCloudName } from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select('+cloudName +cloudinaryApiKeyEncrypted +cloudinaryApiSecretEncrypted');

    const effectiveCloudName = user?.cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    if (effectiveCloudName) setCurrentCloudName(effectiveCloudName);

    const hasUserKeysEncrypted = !!user?.cloudinaryApiKeyEncrypted && !!user?.cloudinaryApiSecretEncrypted;
    if (hasUserKeysEncrypted) {
      const { decryptSecret } = await import('@/lib/crypto');
      try {
        const apiKey = decryptSecret(user.cloudinaryApiKeyEncrypted as string);
        const apiSecret = decryptSecret(user.cloudinaryApiSecretEncrypted as string);
        applyCloudinaryConfig({ cloud_name: effectiveCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: apiKey, api_secret: apiSecret });
      } catch (e) {
        console.error('Failed to decrypt Cloudinary credentials for user:', e);
        return NextResponse.json({ error: 'Failed to decrypt Cloudinary credentials' }, { status: 500 });
      }
    } else {
      applyCloudinaryConfig({ cloud_name: effectiveCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    }

    // List uploaded videos and infer folders from public_id
    const result = await cloudinary.api.resources({ resource_type: 'video', type: 'upload', max_results: 500 });
    const resources = Array.isArray(result.resources) ? result.resources : [];

    const folders = new Set<string>();
    for (const res of resources) {
      const publicId = String(res.public_id || '');
      if (!publicId) continue;
      const parts = publicId.split('/');
      if (parts.length > 1) {
        parts.pop();
        folders.add(parts.join('/'));
      }
    }

    const folderArray = Array.from(folders).sort();
    return NextResponse.json({ folders: folderArray });
  } catch (error: any) {
    console.error('Error listing folders:', error);
    return NextResponse.json({ error: error.message || 'Failed to list folders' }, { status: 500 });
  }
}
