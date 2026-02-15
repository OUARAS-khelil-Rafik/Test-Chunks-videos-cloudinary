import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { redirect } from 'next/navigation';
import { VideoUploader } from '@/components/VideoUploader';

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/upload');
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
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
