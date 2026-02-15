import { VideoUploader } from '@/components/VideoUploader';

export default function UploadPage() {
  return (
    <div className="py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Upload Video</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your video and share it with the world
        </p>
      </div>
      <VideoUploader />
    </div>
  );
}
