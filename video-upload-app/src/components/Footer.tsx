import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-12 border-t py-8 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items:center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">© {new Date().getFullYear()} VideoHub. All rights reserved.</div>
        <div className="flex items-center space-x-4 text-sm">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
