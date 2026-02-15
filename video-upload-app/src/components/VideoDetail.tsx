'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import SeamlessPlayer from './SeamlessPlayer';
import { 
  Calendar, HardDrive, Film, Monitor, Activity, 
  Edit, Trash2, ArrowLeft, Download, Info 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Video {
  _id: string;
  userId: string;
  publicId: string;
  secureUrl: string;
  thumbnail: string;
  title: string;
  description?: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  bitRate: number;
  frameRate: number;
  audioCodec: string;
  videoCodec: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  isMultipart?: boolean;
  totalParts?: number;
  parts?: Array<{
    publicId: string;
    secureUrl: string;
    format: string;
    duration: number;
    width: number;
    height: number;
    aspectRatio?: string;
    bitRate?: number;
    frameRate?: number;
    videoCodec?: string;
    audioCodec?: string;
    fileSize: number;
  }>;
}

export function VideoDetail() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '' });

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data } = await axios.get(`/api/videos/${params.id}`);
        setVideo(data);
        setEditData({ title: data.title, description: data.description || '' });
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to fetch video');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVideo();
    }
  }, [params.id]);

  const handleUpdate = async () => {
    try {
      const { data } = await axios.patch(`/api/videos/${params.id}`, editData);
      setVideo(data);
      setIsEditing(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update video');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const partsToDelete = (video?.parts || []).map((p) => p.publicId).filter(Boolean);
      // include primary id as well to be safe
      if (video?.publicId) partsToDelete.unshift(video.publicId);
      const res = await axios.delete(`/api/videos/${params.id}`, { data: { parts: partsToDelete } });
      if (res.status >= 200 && res.status < 300) {
        router.push('/videos');
      } else {
        const data = res.data;
        alert(data?.error || 'Failed to delete video');
      }
    } catch (error: any) {
      const errData = error.response?.data;
      if (errData?.failedIds) {
        alert('Cloudinary deletion failed for some parts: ' + errData.failedIds.join(', '));
      } else {
        alert(errData?.error || 'Failed to delete video');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBitrate = (bps: number) => {
    return `${Math.round(bps / 1000)} kbps`;
  };

  const parts = video?.parts || [];
  const isMultipart = parts.length > 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4 text-lg font-semibold">{error || 'Video not found'}</div>
        <button
          onClick={() => router.push('/videos')}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Back to Videos
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={() => router.push('/videos')}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to videos</span>
      </button>

      {/* Video Player */}
      <div className="glass rounded-xl overflow-hidden">
        <SeamlessPlayer
          url={video.secureUrl}
          parts={isMultipart ? parts.map(p => ({ secureUrl: p.secureUrl, duration: p.duration })) : undefined}
          totalDuration={video.duration}
        />
      </div>

      {/* Video Info & Actions */}
      <div className="glass rounded-xl p-6 space-y-6">
        {/* Title & Description */}
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Video title"
              />
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                placeholder="Video description (optional)"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({ title: video.title, description: video.description || '' });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{video.title}</h1>
              {video.description && (
                <p className="text-gray-600 dark:text-gray-400">{video.description}</p>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <a
              href={video.secureUrl}
              download
              className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="w-5 h-5 text-gray-400" />
          <h2 className="text-xl font-semibold">Video Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Duration */}
          <div className="flex items-start space-x-3">
            <Film className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Duration</div>
              <div className="font-medium">{formatDuration(video.duration)}</div>
            </div>
          </div>

          {/* Resolution */}
          <div className="flex items-start space-x-3">
            <Monitor className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Resolution</div>
              <div className="font-medium">{video.width}x{video.height}</div>
            </div>
          </div>

          {/* File Size */}
          <div className="flex items-start space-x-3">
            <HardDrive className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">File Size</div>
              <div className="font-medium">{formatFileSize(video.fileSize)}</div>
            </div>
          </div>

          {/* Format */}
          <div className="flex items-start space-x-3">
            <Film className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Format</div>
              <div className="font-medium">{video.format.toUpperCase()}</div>
            </div>
          </div>

          {/* Bitrate */}
          <div className="flex items-start space-x-3">
            <Activity className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Bitrate</div>
              <div className="font-medium">{formatBitrate(video.bitRate)}</div>
            </div>
          </div>

          {/* Frame Rate */}
          <div className="flex items-start space-x-3">
            <Activity className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Frame Rate</div>
              <div className="font-medium">{video.frameRate} fps</div>
            </div>
          </div>

          {/* Video Codec */}
          <div className="flex items-start space-x-3">
            <Film className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Video Codec</div>
              <div className="font-medium">{video.videoCodec}</div>
            </div>
          </div>

          {/* Audio Codec */}
          <div className="flex items-start space-x-3">
            <Film className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Audio Codec</div>
              <div className="font-medium">{video.audioCodec}</div>
            </div>
          </div>

          {/* Upload Date */}
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Uploaded</div>
              <div className="font-medium">
                {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Public ID */}
          <div className="flex items-start space-x-3 md:col-span-2">
            <Info className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Cloudinary Public ID</div>
              <div className="font-medium text-sm break-all">{video.publicId}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
