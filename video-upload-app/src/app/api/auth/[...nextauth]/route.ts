import NextAuth from 'next-auth';
import authOptions from '@/lib/authOptions';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const handler = NextAuth(authOptions as any);

export { handler as GET, handler as POST };
