import { NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_LOGS_CHANNEL_ID = process.env.DISCORD_LOGS_CHANNEL_ID;

// Regex to match WCL URLs
const WCL_URL_REGEX = /https?:\/\/(?:classic\.)?warcraftlogs\.com\/reports\/[a-zA-Z0-9]+/g;

export async function GET() {
  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json({ error: 'Discord bot not configured' }, { status: 500 });
  }

  if (!DISCORD_LOGS_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'DISCORD_LOGS_CHANNEL_ID not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch recent messages from the logs channel
    const response = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_LOGS_CHANNEL_ID}/messages?limit=50`,
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
        { error: 'Failed to fetch messages from Discord' },
        { status: response.status }
      );
    }

    const messages = await response.json();

    // Extract WCL links from messages
    const logLinks: Array<{
      id: string;
      url: string;
      timestamp: string;
      author: string;
    }> = [];

    for (const message of messages) {
      const urls = message.content.match(WCL_URL_REGEX);
      if (urls) {
        for (const url of urls) {
          // Avoid duplicates
          if (!logLinks.some((l) => l.url === url)) {
            logLinks.push({
              id: `${message.id}-${url}`,
              url,
              timestamp: message.timestamp,
              author: message.author.global_name || message.author.username,
            });
          }
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    logLinks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to 10 most recent
    return NextResponse.json(logLinks.slice(0, 10));
  } catch (error) {
    console.error('Failed to fetch log links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log links' },
      { status: 500 }
    );
  }
}
