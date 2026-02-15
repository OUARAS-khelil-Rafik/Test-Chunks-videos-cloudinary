'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_FORMATS = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/webm': ['.webm'],
};

interface UploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  videoData: any | null;
}

export function VideoUploader({ cloudName, initialCloudName }: { cloudName: string; initialCloudName?: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="text-center py-20">Checking authentication...</div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto space-y-4 p-6 glass rounded-2xl text-center">
        <h2 className="text-xl font-semibold">Sign in to upload videos</h2>
        <p className="text-sm text-gray-500">You must be signed in to upload videos. Please sign in or create an account.</p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => signIn()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Sign In
          </button>
          <a href="/auth/signup" className="px-4 py-2 border rounded-lg hover:bg-gray-100">Sign Up</a>
        </div>
      </div>
    );
  }
  const [state, setState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    videoData: null,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cloudNameInput, setCloudNameInput] = useState((initialCloudName || cloudName || '').trim());

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      setState((prev) => ({
        ...prev,
        error: error.code === 'file-too-large'
          ? 'File too large. Maximum size is 2GB.'
          : 'Invalid file type. Please upload a video file.',
      }));
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setState({
        file,
        uploading: false,
        progress: 0,
        error: null,
        success: false,
        videoData: null,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = () => {
    setState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false,
      videoData: null,
    });
    setTitle('');
    setDescription('');
  };

  const uploadVideo = async () => {
    if (!state.file || !title.trim()) {
      setState((prev) => ({ ...prev, error: 'Please provide a title' }));
      return;
    }


    if (!cloudNameInput.trim()) {
      setState((prev) => ({ ...prev, error: 'Please enter your Cloudinary cloud name.' }));
      return;
    }

    setState((prev) => ({ ...prev, uploading: true, progress: 0, error: null }));

    try {

      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('cloudName', cloudNameInput.trim());

      const { data: videoData } = await axios.post('/api/videos/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setState((prev) => ({ ...prev, progress }));
        },
      });

      setState((prev) => ({
        ...prev,
        uploading: false,
        success: true,
        videoData,
        progress: 100,
      }));

      // Auto-redirect to video detail after a short delay
      setTimeout(() => {
        if (videoData?._id) router.push(`/videos/${videoData._id}`);
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: error.response?.data?.error || 'Failed to upload video',
      }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Dropzone */}
      {!state.file && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {isDragActive ? 'Drop video here' : 'Drag & drop your video'}
              </p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-gray-400">
              MP4, MOV, AVI, MKV, WEBM • Max 2GB (auto-split)
            </p>
          </div>
          </motion.div>
        </div>
      )}

      {/* File Preview & Upload Form */}
      <AnimatePresence>
        {state.file && !state.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-6 space-y-6"
          >
            {/* File Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Film className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium truncate max-w-md">{state.file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(state.file.size)}</p>
                </div>
              </div>
              {!state.uploading && (
                <button
                  onClick={removeFile}
                  aria-label="Remove file"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={state.uploading}
                  className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder="Enter video title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cloudinary Cloud Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={cloudNameInput}
                  onChange={(e) => setCloudNameInput(e.target.value)}
                  disabled={state.uploading}
                  className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder="your-cloud-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={state.uploading}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 resize-none"
                  placeholder="Enter video description (optional)"
                />
              </div>
            </div>

            {/* Progress Bar */}
            {state.uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{state.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${state.progress}%` }}
                    className="h-full gradient-primary"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {state.error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{state.error}</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={uploadVideo}
              disabled={state.uploading || !title.trim()}
              className="w-full py-3 rounded-lg gradient-primary text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {state.uploading ? (
                <>
                  <div className="spinner" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Video</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Success Message */}
        {state.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Upload Successful!</h3>
              <p className="text-gray-500 mt-2">Your video has been uploaded and saved.</p>
              {state.videoData?._id && (
                <div className="mt-4">
                  <a
                    href={`/videos/${state.videoData._id}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                  >
                    View Video
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error from initial validation */}
      {state.error && !state.file && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </motion.div>
      )}
    </div>
  );
}
