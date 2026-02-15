import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { cloudName, cloudinaryApiKey, cloudinaryApiSecret, currentPassword, newPassword } = body;

    if (newPassword && newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select('+password +cloudinaryApiKeyEncrypted +cloudinaryApiSecretEncrypted');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      user.password = newPassword; // will be hashed by pre-save
    }

    // Update cloudName
    if (typeof cloudName === 'string') user.cloudName = cloudName.trim();

    // Encrypt Cloudinary keys if provided
    if (cloudinaryApiKey) {
      const { encryptSecret } = await import('@/lib/crypto');
      user.cloudinaryApiKeyEncrypted = encryptSecret(String(cloudinaryApiKey));
    }
    if (cloudinaryApiSecret) {
      const { encryptSecret } = await import('@/lib/crypto');
      user.cloudinaryApiSecretEncrypted = encryptSecret(String(cloudinaryApiSecret));
    }

    await user.save();

    return NextResponse.json({ message: 'Settings updated' });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
