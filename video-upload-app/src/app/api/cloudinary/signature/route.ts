import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import { generateSignedUploadParams } from '@/lib/cloudinary';

// This route depends on request headers/cookies for authentication
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate signed upload parameters
    const uploadParams = generateSignedUploadParams();

    return NextResponse.json(uploadParams);
  } catch (error: any) {
    console.error('Signature generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload signature' },
      { status: 500 }
    );
  }
}
