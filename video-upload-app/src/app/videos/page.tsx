import { VideoGrid } from '@/components/VideoGrid';

export default function VideosPage() {
  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Videos</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and view all your uploaded videos
        </p>
      </div>
      <VideoGrid />
    </div>
  );
}
