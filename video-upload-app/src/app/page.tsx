import Link from 'next/link';
import { Play, Upload, Video, Shield, Zap, Cloud } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session?.user?.id;
  const features = [
    {
      icon: Shield,
      title: 'Secure Upload',
      description: 'Enterprise-grade security with signed uploads and authentication',
    },
    {
      icon: Cloud,
      title: 'Cloud Storage',
      description: 'Powered by Cloudinary for reliable and scalable video hosting',
    },
    {
      icon: Zap,
      title: 'Fast Streaming',
      description: 'Optimized video delivery with adaptive bitrate streaming',
    },
    {
      icon: Video,
      title: 'HD Quality',
      description: 'Support for high-resolution videos up to 4K',
    },
  ];

  return (
    <div className="space-y-20 py-10">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Play className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Your Premium Video Platform
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Upload, manage, and stream your videos with ease. Professional video hosting
          made simple with cutting-edge technology.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/upload"
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Video</span>
          </Link>
          
          <Link
            href="/videos"
            className="px-8 py-4 border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-lg font-semibold text-lg transition-colors"
          >
            Browse Videos
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass rounded-xl p-6 text-center space-y-4 hover:shadow-xl transition-shadow"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="glass rounded-2xl p-12 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              25GB
            </div>
            <div className="text-gray-600 dark:text-gray-400">Free Storage</div>
          </div>
          <div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              4K
            </div>
            <div className="text-gray-600 dark:text-gray-400">Max Resolution</div>
          </div>
          <div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              24/7
            </div>
            <div className="text-gray-600 dark:text-gray-400">Availability</div>
          </div>
        </div>
      </section>

      {/* CTA Section - hidden when signed in */}
      {!isSignedIn && (
        <section className="text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Join thousands of creators who trust our platform for their video hosting needs.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Create Free Account
          </Link>
        </section>
      )}
    </div>
  );
}
