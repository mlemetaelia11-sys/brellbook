import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const nextAuth = NextAuth({
  session: {
    strategy: 'jwt',
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();

        const user = await db.user.findUnique({
          where: {
            email,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.imageKey || undefined,
        };
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      if (account?.provider === 'google') {
        const email = user.email.toLowerCase();

        let existing = await db.user.findUnique({
          where: {
            email,
          },
        });

        if (!existing) {
          existing = await db.user.create({
            data: {
              email,
              name: user.name || 'BrellBook User',
              imageKey: user.image || null,
              emailVerified: new Date(),
            },
          });
        }

        user.id = existing.id;
        user.name = existing.name;
        user.email = existing.email;
        user.image =
          existing.imageKey || user.image || undefined;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
});

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = nextAuth;

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

export async function requireBusiness(userId: string) {
  const ownedBusiness = await db.business.findUnique({
    where: {
      ownerId: userId,
    },
    include: {
      subscription: true,
    },
  });

  if (ownedBusiness?.active) {
    return ownedBusiness;
  }

  const membership = await db.businessMembership.findFirst({
    where: {
      userId,
      business: {
        active: true,
      },
    },
    include: {
      business: {
        include: {
          subscription: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!membership?.business) {
    throw new Error(
      'No active business found for this user.',
    );
  }

  return membership.business;
}

export async function requireAdmin(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user?.isPlatformAdmin) {
    throw new Error('Forbidden');
  }

  return user;
}

export async function clearSession() {
  await signOut({
    redirect: false,
  });
}