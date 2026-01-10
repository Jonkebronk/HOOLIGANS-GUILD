import { NextResponse } from 'next/server';

export async function GET() {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const hasDiscordClientId = !!process.env.DISCORD_CLIENT_ID;
  const hasDiscordSecret = !!process.env.DISCORD_CLIENT_SECRET;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;

  return NextResponse.json({
    status: 'ok',
    config: {
      nextAuthUrl: nextAuthUrl || 'NOT SET',
      hasDiscordClientId,
      hasDiscordSecret,
      hasNextAuthSecret,
      expectedCallback: nextAuthUrl
        ? `${nextAuthUrl}/api/auth/callback/discord`
        : 'NEXTAUTH_URL not set',
    },
  });
}
