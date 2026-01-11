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
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
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
        { error: 'Failed to fetch roles' },
        { status: response.status }
      );
    }

    const roles = await response.json();

    // Sort by position (higher = more important) and filter out @everyone
    const sortedRoles = roles
      .filter((role: { name: string }) => role.name !== '@everyone')
      .sort((a: { position: number }, b: { position: number }) => b.position - a.position)
      .map((role: { id: string; name: string; color: number }) => ({
        id: role.id,
        name: role.name,
        color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null,
      }));

    return NextResponse.json(sortedRoles);
  } catch (error) {
    console.error('Failed to fetch Discord roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
