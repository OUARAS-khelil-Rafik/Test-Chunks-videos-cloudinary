import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/profile');
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>
      <div className="glass rounded-2xl p-6 max-w-md">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
