import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import Video from '@/models/Video';
import User from '@/models/User';
import { deleteVideo as deleteCloudinaryVideo, applyCloudinaryConfig, deleteResources, deleteResourcesByPrefix } from '@/lib/cloudinary';

// Simple retryable check for delete errors
const isRetryable = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  const httpCode = Number(error?.http_code || 0);
  return message.includes('timeout') || httpCode === 503 || httpCode === 504;
};

async function deleteWithRetry(publicId: string, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      // Prefer batch delete by id (handles upload type video)
      await deleteResources([publicId]);
      return { success: true };
    } catch (err: any) {
      if (i < attempts - 1 && isRetryable(err)) {
        // small backoff
        await new Promise((res) => setTimeout(res, 500 * (i + 1)));
        continue;
      }
      return { success: false, error: String(err?.message || err) };
    }
  }
  return { success: false, error: 'Unknown error' };
}

// GET - Get single video by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const video = await Video.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('Get video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

// PATCH - Update video metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await req.json();

    await connectDB();

    const video = await Video.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      { title, description },
      { new: true, runValidators: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('Update video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE - Delete video
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const video = await Video.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Ensure Cloudinary credentials are available on the USER (do NOT fall back to server env)
    const user = await User.findById(session.user.id).select('+cloudName +cloudinaryApiKeyEncrypted +cloudinaryApiSecretEncrypted');
    const hasUserKeysEncrypted = !!user?.cloudinaryApiKeyEncrypted && !!user?.cloudinaryApiSecretEncrypted;

    if (!hasUserKeysEncrypted) {
      return NextResponse.json({ error: 'Cloudinary credentials are not configured on your profile. Please add them in your profile to allow deletions.' }, { status: 400 });
    }

    // Determine cloud name to use for deletion from the video metadata or the user's profile.
    // Do NOT use environment variables for the cloud name here — require stored metadata on video or user.
    const cloudNameFromVideo = String(video?.cloudName || '').trim();
    const cloudNameFromUser = String(user?.cloudName || '').trim();
    const cloudNameForDeletion = cloudNameFromVideo || cloudNameFromUser || '';

    if (!cloudNameForDeletion) {
      return NextResponse.json({ error: 'Cloudinary cloud name is missing on the video and user profile. Please set it in your profile.' }, { status: 400 });
    }

    // Apply per-request Cloudinary configuration using the user's encrypted keys (no env fallback)
    const { decryptSecret } = await import('@/lib/crypto');
    try {
      const apiKey = decryptSecret(user.cloudinaryApiKeyEncrypted as string);
      const apiSecret = decryptSecret(user.cloudinaryApiSecretEncrypted as string);
      applyCloudinaryConfig({ cloud_name: cloudNameForDeletion, api_key: apiKey, api_secret: apiSecret });
    } catch (e) {
      console.error('Failed to decrypt Cloudinary credentials for user:', e);
      return NextResponse.json({ error: 'Failed to decrypt Cloudinary credentials. Please update your profile.' }, { status: 500 });
    }

    // Prefer parts list provided by client (explicit deletion list), otherwise use DB-stored parts
    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      body = null;
    }

    const clientParts: string[] | null = Array.isArray(body?.parts) ? body.parts.map(String).filter(Boolean) : null;

    const publicIds = new Set<string>();
    if (clientParts && clientParts.length > 0) {
      clientParts.forEach((id) => publicIds.add(id));
    } else {
      if (video.publicId) publicIds.add(video.publicId);
      if (Array.isArray(video.parts)) {
        for (const p of video.parts) {
          if (p?.publicId) publicIds.add(p.publicId);
        }
      }
    }

    // Attempt prefix-based deletion for multipart uploads to remove all parts at once
    const ids = Array.from(publicIds);
    const failedIds: string[] = [];

    // If multipart, attempt delete by prefix derived from part naming
    const multipartPrefixes = new Set<string>();
    for (const id of ids) {
      const m = id.match(/^(.*)-part-\d{3}$/);
      if (m) multipartPrefixes.add(m[1]);
    }

    // First try delete by prefix (if any) — use `cloudNameForDeletion` computed above (from video metadata or user)
    if (multipartPrefixes.size > 0) {
      if (cloudNameForDeletion) {
        for (const prefix of multipartPrefixes) {
          try {
            await deleteResourcesByPrefix(prefix);
          } catch (err: any) {
            console.error('Prefix delete failed for', prefix, err);
            // record the failed prefix (we'll still try explicit ids)
            failedIds.push(prefix);
          }
        }
      } else {
        console.warn('No Cloudinary cloud name found on video or user and no server env configured; skipping prefix deletion, will attempt explicit ID deletions');
      }
    }

    // Then ensure any remaining explicit ids are deleted (or all if prefix deletion skipped)
    const remainingIds = ids.filter((id) => !Array.from(multipartPrefixes).some((p) => id.startsWith(p)));
    if (remainingIds.length > 0) {
      const deleteResults = await Promise.all(remainingIds.map((id) => deleteWithRetry(id)));
      deleteResults.forEach((res, idx) => {
        if (!res.success) failedIds.push(remainingIds[idx]);
      });
    }

    // If any Cloudinary deletions failed, do NOT remove the DB record and report error so client can retry.
    if (failedIds.length > 0) {
      console.error('Failed to delete Cloudinary resources:', failedIds);
      return NextResponse.json(
        { error: 'Failed to delete some Cloudinary resources', failedIds },
        { status: 500 }
      );
    }

    // All Cloudinary deletions succeeded — remove DB record and return success
    await Video.deleteOne({ _id: params.id });
    return NextResponse.json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Delete video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete video' },
      { status: 500 }
    );
  }
}
