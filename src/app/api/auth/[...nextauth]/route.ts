import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectToDatabase from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import User from '@/models/User';
import { ISessionUser, UserRole } from '@/types';

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        skipVerification: { label: 'Skip Verification', type: 'boolean' }
      },
      async authorize(credentials) {
        await connectToDatabase();

        // Handle superadmin direct access
        if (
          credentials?.email === process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL &&
          credentials?.password === process.env.NEXT_PUBLIC_SUPERADMIN_PASSWORD
        ) {
          return {
            id: 'superadmin',
            name: 'Super Admin',
            email: process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL,
            role: 'superadmin'
          } as ExtendedUser;
        }

        // Regular user authentication
        const user = await User.findOne({ email: credentials?.email }).select('+password +emailVerified');
        if (!user) throw new Error('No user found with this email');

        // Skip verification check if flag is set (for special cases)
        if (!credentials?.skipVerification && !user.emailVerified) {
          throw new Error('Please verify your email first');
        }

        const isValid = await verifyPassword(
          credentials?.password || '',
          user.password
        );
        if (!isValid) throw new Error('Incorrect password');

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        } as ExtendedUser;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.name = extendedUser.name;
        token.email = extendedUser.email;
        token.role = extendedUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      const sessionUser: ISessionUser = {
        id: token.id as string,
        name: token.name as string,
        email: token.email as string,
        role: token.role as UserRole
      };

      session.user = sessionUser;
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/verify-otp'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };