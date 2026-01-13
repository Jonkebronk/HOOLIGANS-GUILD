import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose minimal health info - no URLs or sensitive config details
  const hasDiscordClientId = !!process.env.DISCORD_CLIENT_ID;
  const hasDiscordSecret = !!process.env.DISCORD_CLIENT_SECRET;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;

  return NextResponse.json({
    status: 'ok',
    config: {
      authConfigured: hasDiscordClientId && hasDiscordSecret && hasNextAuthSecret && hasNextAuthUrl,
      discord: hasDiscordClientId && hasDiscordSecret,
      auth: hasNextAuthSecret && hasNextAuthUrl,
    },
  });
}
