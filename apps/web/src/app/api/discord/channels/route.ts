import { NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET() {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Discord API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: response.status }
      );
    }

    const channels = await response.json();

    // Filter to only text channels (type 0) and sort by position
    const textChannels = channels
      .filter((channel: { type: number }) => channel.type === 0)
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((channel: { id: string; name: string }) => ({
        id: channel.id,
        name: channel.name,
      }));

    return NextResponse.json(textChannels);
  } catch (error) {
    console.error('Failed to fetch Discord channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}
