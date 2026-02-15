import { v2 as cloudinary } from 'cloudinary';

// runtime-configurable cloud name (defaults to env var)
let CURRENT_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

export function setCurrentCloudName(name?: string) {
  CURRENT_CLOUD_NAME = (name || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
  try {
    cloudinary.config({ cloud_name: CURRENT_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, secure: true });
  } catch (e) {
    // ignore
  }
}

export function getCurrentCloudName() {
  return CURRENT_CLOUD_NAME;
}

// Helper to apply a per-request Cloudinary config (cloud_name, api_key, api_secret)
export function applyCloudinaryConfig(override?: { cloud_name?: string; api_key?: string; api_secret?: string }) {
  if (!override) return;
  cloudinary.config({
    cloud_name: override.cloud_name || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: override.api_key || process.env.CLOUDINARY_API_KEY,
    api_secret: override.api_secret || process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Generate signed upload parameters for Cloudinary
 */
export const generateSignedUploadParams = () => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const uploadPreset = 'video_uploads';
  
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      upload_preset: uploadPreset,
      folder: 'video-platform',
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    uploadPreset,
    folder: 'video-platform',
  };
};

/**
 * Get video metadata from Cloudinary
 */
export const getVideoMetadata = async (publicId: string, overrideConfig?: { cloud_name?: string; api_key?: string; api_secret?: string }) => {
  try {
    if (overrideConfig) applyCloudinaryConfig(overrideConfig);
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video',
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      duration: result.duration,
      width: result.width,
      height: result.height,
      aspectRatio: result.aspect_ratio,
      bitRate: result.bit_rate,
      frameRate: result.frame_rate,
      videoCodec: result.video?.codec,
      audioCodec: result.audio?.codec,
      fileSize: result.bytes,
      createdAt: result.created_at,
      thumbnail: cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ width: 400, height: 225, crop: 'fill' }],
      }),
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    throw new Error('Failed to fetch video metadata');
  }
};

/**
 * List all videos from Cloudinary
 */
export const listVideos = async (options?: { maxResults?: number; nextCursor?: string }) => {
  try {
    const result = await cloudinary.api.resources({
      resource_type: 'video',
      type: 'upload',
      prefix: 'video-platform',
      max_results: options?.maxResults || 30,
      next_cursor: options?.nextCursor,
    });

    return {
      videos: result.resources,
      nextCursor: result.next_cursor,
    };
  } catch (error) {
    console.error('Error listing videos:', error);
    throw new Error('Failed to list videos');
  }
};

/**
 * Delete video from Cloudinary
 */
export const deleteVideo = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    throw new Error('Failed to delete video');
  }
};

/** Delete multiple resources by public IDs */
export const deleteResources = async (publicIds: string[]) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, { resource_type: 'video', type: 'upload' });
    return result;
  } catch (error) {
    console.error('Error deleting resources:', error);
    throw new Error('Failed to delete resources');
  }
};

/** Delete resources by prefix (deletes all resources with public_id starting with prefix) */
export const deleteResourcesByPrefix = async (prefix: string) => {
  try {
    const result = await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'video', type: 'upload' });
    return result;
  } catch (error) {
    console.error('Error deleting resources by prefix:', error);
    throw new Error('Failed to delete resources by prefix');
  }
};

export default cloudinary;
