import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { VideoGrid } from '@/components/VideoGrid';
import connectDB from '@/lib/db';

export default async function VideosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/videos');
  }

  // ensure DB connected for any server-side needs
  await connectDB();

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Videos</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage and view all your uploaded videos</p>
      </div>
      <VideoGrid />
    </div>
  );
}
