import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@hooligans/database';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch the user's role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) {
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        // Update Discord-specific fields
        const discordProfile = profile as {
          id: string;
          username: string;
          discriminator: string;
          avatar: string | null;
        };

        await prisma.user.upsert({
          where: { id: user.id! },
          update: {
            discordId: discordProfile.id,
            discordName: `${discordProfile.username}`,
          },
          create: {
            id: user.id!,
            discordId: discordProfile.id,
            discordName: `${discordProfile.username}`,
            email: user.email,
            name: user.name,
            image: user.image,
          },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
});
