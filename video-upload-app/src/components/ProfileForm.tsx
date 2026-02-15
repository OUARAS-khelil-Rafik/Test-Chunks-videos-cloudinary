'use client';

import { useState } from 'react';

export default function ProfileForm({ user }: { user: any }) {
  const [cloudName, setCloudName] = useState(user?.cloudName || '');
  const [editingCreds, setEditingCreds] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasStoredKeys = !!user?.cloudinaryApiKeyEncrypted && !!user?.cloudinaryApiSecretEncrypted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('cloudName', cloudName || '');
      if (editingCreds) {
        form.append('cloudinaryApiKey', apiKey);
        form.append('cloudinaryApiSecret', apiSecret);
      }
      const res = await fetch('/api/user/profile', { method: 'POST', body: form });
      if (res.ok) {
        setMessage('Profile updated');
        setEditingCreds(false);
        setApiKey('');
        setApiSecret('');
        // reload to show updated masked state
        setTimeout(() => location.reload(), 600);
      } else {
        const data = await res.json();
        setMessage(data?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">Cloudinary Credentials</label>
          <button type="button" onClick={() => setEditingCreds((s) => !s)} className="text-sm text-blue-600">
            {editingCreds ? 'Cancel' : hasStoredKeys ? 'Update' : 'Add'}
          </button>
        </div>

        {hasStoredKeys && !editingCreds ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600">API Key: ••••••••{user?.cloudinaryApiKeyEncrypted ? '' : ''}</div>
            <div className="text-sm text-gray-600">API Secret: ••••••••••••••</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <input
                name="cloudinaryApiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Cloudinary API Key"
              />
            </div>
            <div>
              <input
                name="cloudinaryApiSecret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                type="password"
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Cloudinary API Secret"
              />
            </div>
          </div>
        )}
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
