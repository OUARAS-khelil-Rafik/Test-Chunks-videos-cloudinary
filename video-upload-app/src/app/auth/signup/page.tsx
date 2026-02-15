'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cloudName: '',
  });

  // Collect Cloudinary secrets (will be encrypted server-side)
  const [cloudData, setCloudData] = useState({ apiKey: '', apiSecret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        cloudinaryApiKey: cloudData.apiKey,
        cloudinaryApiSecret: cloudData.apiSecret,
        cloudName: formData.cloudName?.trim(),
      });

      // Redirect to sign in
      router.push('/auth/signin?registered=true');
    } catch (error: any) {
      setError(error.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Join us and start uploading videos
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Cloudinary API Key */}
              <div>
                <label className="block text-sm font-medium mb-2">CLOUDINARY_API_KEY (optional)</label>
                <input
                  type="text"
                  value={cloudData.apiKey}
                  onChange={(e) => setCloudData({ ...cloudData, apiKey: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Cloudinary API Key"
                />
              </div>

              {/* Cloudinary API Secret */}
              <div>
                <label className="block text-sm font-medium mb-2">CLOUDINARY_API_SECRET (optional)</label>
                <input
                  type="password"
                  value={cloudData.apiSecret}
                  onChange={(e) => setCloudData({ ...cloudData, apiSecret: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Cloudinary API Secret"
                />
              </div>
              {/* Cloudinary Cloud Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Cloudinary Cloud Name (optional)</label>
                <input
                  type="text"
                  value={formData.cloudName}
                  onChange={(e) => setFormData({ ...formData, cloudName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="your-cloud-name"
                />
              </div>
            </div>

              {/* Note: Cloudinary keys are optional and collected above if provided */}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
