'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Moon, Sun, Video, LogOut, Upload, Grid } from 'lucide-react';
import { useThemeStore } from '@/store';
import { motion } from 'framer-motion';

export function Navbar() {
  const { data: session } = useSession();
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 glass border-b"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Video className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              VideoHub
            </span>
          </Link>

          {/* Nav Links */}
          {session && (
            <div className="flex items-center space-x-1">
              <Link 
                href="/upload"
                className="px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </Link>
              <Link 
                href="/videos"
                className="px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Videos</span>
              </Link>
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Auth Buttons */}
            {session ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg gradient-primary text-white hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
