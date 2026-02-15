'use client';

import { useState } from 'react';

export default function SettingsForm({ user }: { user: any }) {
  const [cloudName, setCloudName] = useState(user?.cloudName || '');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (newPassword && newPassword.length < 6) {
        setMessage('New password must be at least 6 characters');
        setLoading(false);
        return;
      }
      if (newPassword && newPassword !== confirmPassword) {
        setMessage('Passwords do not match');
        setLoading(false);
        return;
      }

      const payload: any = { cloudName };
      if (apiKey) payload.cloudinaryApiKey = apiKey;
      if (apiSecret) payload.cloudinaryApiSecret = apiSecret;
      if (newPassword) {
        payload.newPassword = newPassword;
        payload.currentPassword = currentPassword;
      }

      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Failed to update settings');
      } else {
        setMessage(data?.message || 'Settings updated');
        setApiKey('');
        setApiSecret('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // optional: refresh
        setTimeout(() => location.reload(), 700);
      }
    } catch (err: any) {
      setMessage(err?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Cloudinary Cloud Name</label>
        <input
          value={cloudName}
          onChange={(e) => setCloudName(e.target.value)}
          name="cloudName"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="your-cloud-name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cloudinary API Key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          name="cloudinaryApiKey"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Cloudinary API Key"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Cloudinary API Secret</label>
        <input
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          name="cloudinaryApiSecret"
          type="password"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Cloudinary API Secret"
        />
      </div>

      <hr />

      <div>
        <label className="block text-sm font-medium mb-2">Change Password</label>
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          placeholder="Current password"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
        />
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          placeholder="New password"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
        />
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirm new password"
          className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>

      {message && <div className="text-sm text-gray-600">{message}</div>}
    </form>
  );
}
