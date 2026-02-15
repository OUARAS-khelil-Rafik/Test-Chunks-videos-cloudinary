import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import Video from '@/models/Video';
import User from '@/models/User';
import cloudinary, { applyCloudinaryConfig, setCurrentCloudName } from '@/lib/cloudinary';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

const MIN_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TARGET_FILE_SIZE = 70 * 1024 * 1024; // 70MB
const CLOUDINARY_LIMIT = 100 * 1024 * 1024; // 100MB
const MAX_PARTS = 20;
const MAX_RETRIES = 3;
const UPLOAD_FOLDER = 'video-platform';

// cloud name is managed in lib/cloudinary
const sanitizeBaseName = (name: string) =>
  name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'video';

const isRetryable = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  const httpCode = Number(error?.http_code || 0);
  return message.includes('timeout') || httpCode === 503 || httpCode === 504;
};

async function checkFFmpeg() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

async function getVideoDuration(filePath: string) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function splitVideo(filePath: string, outputDir: string, baseName: string) {
  const fileSize = fsSync.statSync(filePath).size;
  const duration = await getVideoDuration(filePath);

  let segments = Math.ceil(fileSize / TARGET_FILE_SIZE);
  if (segments > MAX_PARTS) segments = MAX_PARTS;
  while (segments > 1 && fileSize / segments < MIN_FILE_SIZE) {
    segments--;
  }

  const segmentDuration = Math.max(1, Math.floor(duration / segments));
  const outputPattern = path.join(outputDir, `${baseName}-part-%03d.mp4`);

  await execFileAsync(
    'ffmpeg',
    [
      '-i',
      filePath,
      '-c',
      'copy',
      '-f',
      'segment',
      '-segment_time',
      segmentDuration.toString(),
      '-reset_timestamps',
      '1',
      '-avoid_negative_ts',
      'make_zero',
      outputPattern,
    ],
    { maxBuffer: 1024 * 1024 * 10 }
  );

  const parts = (await fs.readdir(outputDir))
    .filter((file) => file.startsWith(`${baseName}-part-`) && file.endsWith('.mp4'))
    .sort()
    .map((file) => path.join(outputDir, file));

  const oversized = parts.some((part) => fsSync.statSync(part).size > CLOUDINARY_LIMIT);
  if (oversized) {
    throw new Error('Parts exceed 100MB limit');
  }

  return parts;
}

function uploadLargePromise(filePath: string, options: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      options,
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

async function uploadWithRetry(filePath: string, publicId: string) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await uploadLargePromise(filePath, {
        resource_type: 'video',
        folder: UPLOAD_FOLDER,
        public_id: publicId,
        chunk_size: 6 * 1024 * 1024,
        timeout: 600000,
        overwrite: false,
      });
      return { result, publicId: result.public_id || `${UPLOAD_FOLDER}/${publicId}` };
    } catch (error: any) {
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Upload failed after retries');
}

async function probeVideo(filePath: string) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration,bit_rate',
    '-show_entries',
    'stream=index,codec_type,codec_name,width,height,avg_frame_rate,bit_rate',
    '-of',
    'json',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const videoStream = streams.find((stream: any) => stream.codec_type === 'video');
  const audioStream = streams.find((stream: any) => stream.codec_type === 'audio');
  const format = data.format || {};

  const avgFrameRate = String(videoStream?.avg_frame_rate || '0/1');
  const [num, den] = avgFrameRate.split('/').map((value) => Number(value));
  const frameRate = den ? Math.round((num / den) * 1000) / 1000 : 0;

  return {
    duration: Number(format.duration || 0),
    width: Number(videoStream?.width || 0),
    height: Number(videoStream?.height || 0),
    videoCodec: videoStream?.codec_name,
    audioCodec: audioStream?.codec_name,
    frameRate,
    bitRate: Number(videoStream?.bit_rate || format.bit_rate || 0),
  };
}

function buildSecureUrl(publicId: string, format: string) {
  try {
    return cloudinary.url(publicId, { resource_type: 'video', format });
  } catch (e) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}.${format}`;
  }
}

async function buildPartMetadataFromUpload(result: any, publicId: string, filePath: string) {
  console.log('[DEBUG] Upload result keys:', Object.keys(result));
  console.log('[DEBUG] secure_url:', result.secure_url);
  console.log('[DEBUG] public_id:', result.public_id);

  const stats = await fs.stat(filePath);
  const probe = await probeVideo(filePath);
  const format = result.format || path.extname(filePath).replace('.', '').toLowerCase();
  const width = result.width || probe.width;
  const height = result.height || probe.height;
  const duration = result.duration || probe.duration;

  // Cloudinary upload_large may not return secure_url in some SDK versions
  const secureUrl = result.secure_url || result.url || buildSecureUrl(publicId, format);

  return {
    publicId,
    secureUrl,
    format,
    duration,
    width,
    height,
    aspectRatio: width && height ? (width / height).toFixed(6) : undefined,
    bitRate: result.bit_rate || probe.bitRate || undefined,
    frameRate: result.frame_rate || probe.frameRate || undefined,
    videoCodec: result.video?.codec || probe.videoCodec,
    audioCodec: result.audio?.codec || probe.audioCodec,
    fileSize: result.bytes || stats.size,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    return NextResponse.json({ error: 'ffmpeg is not installed on the server' }, { status: 500 });
  }

  let tempDir = '';
  try {
    const formData = await req.formData();
    const cloudNameFromClient = String(formData.get('cloudName') || '').trim();

    // Use server env API key/secret; prefer user's saved non-secret cloudName or client-provided cloudName
    await connectDB();
    const user = await User.findById(session.user.id).select('+cloudName +cloudinaryApiKeyEncrypted +cloudinaryApiSecretEncrypted');
    const effectiveCloudName = cloudNameFromClient || user?.cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    if (effectiveCloudName) setCurrentCloudName(effectiveCloudName);
    // Ensure Cloudinary credentials exist either in server env or user's encrypted profile
    const hasServerKeys = !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
    const hasUserKeysEncrypted = !!user?.cloudinaryApiKeyEncrypted && !!user?.cloudinaryApiSecretEncrypted;
    if (!hasServerKeys && !hasUserKeysEncrypted) {
      return NextResponse.json({ error: 'Cloudinary credentials are not configured. Please add them in your profile or set server env variables.' }, { status: 400 });
    }

    // Apply per-request Cloudinary configuration: prefer user-provided encrypted keys, otherwise server env keys.
    if (hasUserKeysEncrypted) {
      const { decryptSecret } = await import('@/lib/crypto');
      try {
        const apiKey = decryptSecret(user.cloudinaryApiKeyEncrypted as string);
        const apiSecret = decryptSecret(user.cloudinaryApiSecretEncrypted as string);
        applyCloudinaryConfig({ cloud_name: effectiveCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: apiKey, api_secret: apiSecret });
      } catch (e) {
        console.error('Failed to decrypt Cloudinary credentials for user:', e);
        return NextResponse.json({ error: 'Failed to decrypt Cloudinary credentials. Please update your profile.' }, { status: 500 });
      }
    } else {
      // Use server env keys but ensure cloud name is set per-request
      applyCloudinaryConfig({ cloud_name: effectiveCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    }

    // If we still don't have cloud name, return error
    if (!effectiveCloudName) {
      return NextResponse.json({ error: 'Cloudinary cloud name is required.' }, { status: 400 });
    }
    const file = formData.get('file');
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-upload-'));
    const baseName = sanitizeBaseName(file.name);
    const uniqueSuffix = Date.now().toString(36);
    const basePublicId = `${baseName}-${uniqueSuffix}`;
    const inputFilePath = path.join(tempDir, file.name);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputFilePath, buffer);

    const fileSize = fsSync.statSync(inputFilePath).size;

    let partsResults: Array<{ result: any; publicId: string; filePath: string }> = [];
    let isMultipart = false;

    if (fileSize <= CLOUDINARY_LIMIT) {
      const uploadResult = await uploadWithRetry(inputFilePath, basePublicId);
      partsResults = [{ ...uploadResult, filePath: inputFilePath }];
    } else {
      isMultipart = true;
      const outputDir = path.join(tempDir, 'split');
      await fs.mkdir(outputDir, { recursive: true });

      const parts = await splitVideo(inputFilePath, outputDir, basePublicId);
      const uploads = [];

      for (let i = 0; i < parts.length; i += 1) {
        const partPublicId = `${basePublicId}-part-${String(i + 1).padStart(3, '0')}`;
        uploads.push(
          uploadWithRetry(parts[i], partPublicId).then((result) => ({
            ...result,
            filePath: parts[i],
          }))
        );
      }

      partsResults = await Promise.all(uploads);
    }

    let partsMetadata = await Promise.all(
      partsResults.map(({ result, publicId, filePath }) =>
        buildPartMetadataFromUpload(result, publicId, filePath)
      )
    );

    // Attach cloudName to each part metadata so deletions and other operations
    // can reference which Cloudinary cloud the part belongs to.
    partsMetadata = partsMetadata.map((p) => ({ ...p, cloudName: effectiveCloudName }));
    const totalDuration = partsMetadata.reduce((sum, part) => sum + (part.duration || 0), 0);
    const totalSize = partsMetadata.reduce((sum, part) => sum + (part.fileSize || 0), 0);
    const primary = partsMetadata[0];

    // connectDB already called above when loading user

    const video = await Video.create({
      userId: session.user.id,
      title,
      description,
      publicId: primary.publicId,
      secureUrl: primary.secureUrl,
      format: primary.format,
      cloudName: effectiveCloudName,
      duration: totalDuration,
      width: primary.width,
      height: primary.height,
      aspectRatio: primary.aspectRatio,
      bitRate: primary.bitRate,
      frameRate: primary.frameRate,
      videoCodec: primary.videoCodec,
      audioCodec: primary.audioCodec,
      fileSize: totalSize,
      thumbnail: cloudinary.url(primary.publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ width: 400, height: 225, crop: 'fill' }],
      }),
      isMultipart,
      totalParts: partsMetadata.length,
      parts: isMultipart ? partsMetadata : [],
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload video' },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
