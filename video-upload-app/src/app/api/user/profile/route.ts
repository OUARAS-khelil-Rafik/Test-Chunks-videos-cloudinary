import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const cloudName = String(form.get('cloudName') || '').trim();
  const cloudKey = String(form.get('cloudinaryApiKey') || '').trim();
  const cloudSecret = String(form.get('cloudinaryApiSecret') || '').trim();

  try {
    await connectDB();
    const update: any = { cloudName };
    if (cloudKey) {
      const { encryptSecret } = await import('@/lib/crypto');
      update.cloudinaryApiKeyEncrypted = encryptSecret(cloudKey);
    }
    if (cloudSecret) {
      const { encryptSecret } = await import('@/lib/crypto');
      update.cloudinaryApiSecretEncrypted = encryptSecret(cloudSecret);
    }
    await User.findByIdAndUpdate(session.user.id, update, { new: true });
    return NextResponse.json({ message: 'Profile updated' }, { status: 200 });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
