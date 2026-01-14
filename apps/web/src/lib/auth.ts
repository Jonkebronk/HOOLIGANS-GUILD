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
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Save Discord ID on every sign-in (for users created before this was added)
      if (account?.provider === 'discord' && profile && user.id) {
        const discordProfile = profile as { id: string; username: string };
        try {
          // Update user with Discord info
          await prisma.user.update({
            where: { id: user.id },
            data: {
              discordId: discordProfile.id,
              discordName: discordProfile.username,
            },
          });

          // Delete all old sessions for this user to ensure fresh session data
          await prisma.session.deleteMany({
            where: { userId: user.id },
          });
        } catch (error) {
          console.error('Failed to update Discord ID on sign-in:', error);
        }
      }
      return true;
    },
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
  },
  events: {
    async linkAccount({ user, account, profile }) {
      if (account.provider === 'discord' && profile) {
        const discordProfile = profile as {
          id: string;
          username: string;
        };
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: discordProfile.id,
            discordName: discordProfile.username,
          },
        });
      }
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
