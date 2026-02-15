'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Play, Trash2, Eye, Calendar, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Link from 'next/link';
import { useVideoStore } from '@/store';
import { formatDistanceToNow } from 'date-fns';

export function VideoGrid() {
  const { videos, setVideos, pagination, setPagination, setLoading, setError } = useVideoStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const fetchVideos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy,
        order,
        ...(searchQuery && { search: searchQuery }),
      });

      const { data } = await axios.get(`/api/videos?${params}`);
      setVideos(data.videos);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error('Fetch videos error:', error);
      setError(error.response?.data?.error || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, order, setVideos, setPagination, setLoading, setError]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const res = await axios.delete(`/api/videos/${id}`);
      const data = res.data;
      if (res.status >= 200 && res.status < 300) {
        // successful deletion — remove locally for snappy UX
        setVideos(videos.filter((v: any) => v._id !== id));
      } else {
        alert(data?.error || 'Failed to delete video');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      const errData = error.response?.data;
      if (errData?.failedIds) {
        alert('Cloudinary deletion failed for some parts. Please retry from the video detail page.');
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
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </form>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-5 h-5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="createdAt">Date</option>
            <option value="title">Title</option>
            <option value="duration">Duration</option>
            <option value="fileSize">Size</option>
          </select>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            aria-label="Sort order"
            className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Play className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
          <p className="text-gray-500">Upload your first video to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, index) => (
            <motion.div
              key={video._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-xl overflow-hidden group hover:shadow-xl transition-shadow"
            >
              {/* Thumbnail */}
              <Link href={`/videos/${video._id}`}>
                <div className="relative aspect-video bg-gray-900 overflow-hidden cursor-pointer">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs font-medium">
                    {formatDuration(video.duration)}
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="p-4 space-y-3">
                <Link href={`/videos/${video._id}`}>
                  <h3 className="font-semibold line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {video.title}
                  </h3>
                </Link>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HardDrive className="w-4 h-4" />
                    <span>{formatFileSize(video.fileSize)}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  {video.width}x{video.height} • {video.format.toUpperCase()}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <Link
                    href={`/videos/${video._id}`}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium text-center flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(video._id)}
                    title="Delete video"
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-8">
          <button
            onClick={() => fetchVideos(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchVideos(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
