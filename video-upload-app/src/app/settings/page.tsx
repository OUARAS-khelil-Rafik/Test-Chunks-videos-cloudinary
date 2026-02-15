import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { redirect } from 'next/navigation';
// Update the import path if the file is located elsewhere, for example:
import SettingsForm from '../../components/SettingsForm';
// Or use the correct relative path based on your project structure.

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/settings');
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  const safeUser = user ? JSON.parse(JSON.stringify(user)) : null;

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage password and Cloudinary credentials</p>
      </div>

      <div className="glass rounded-2xl p-6 max-w-md">
        <SettingsForm user={safeUser} />
      </div>
    </div>
  );
}
