import { NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_LOGS_CHANNEL_ID = process.env.DISCORD_LOGS_CHANNEL_ID;

// Regex to match WCL URLs (classic, fresh, or regular warcraftlogs)
const WCL_URL_REGEX = /https?:\/\/(?:classic\.|fresh\.)?warcraftlogs\.com\/reports\/[a-zA-Z0-9]+/g;

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

    // Extract WCL links from messages (including embeds)
    const logLinks: Array<{
      id: string;
      url: string;
      timestamp: string;
      author: string;
      title?: string;
    }> = [];

    for (const message of messages) {
      const author = message.author.global_name || message.author.username;

      // Check message content
      const contentUrls = message.content.match(WCL_URL_REGEX);
      if (contentUrls) {
        for (const url of contentUrls) {
          if (!logLinks.some((l) => l.url === url)) {
            logLinks.push({
              id: `${message.id}-${url}`,
              url,
              timestamp: message.timestamp,
              author,
            });
          }
        }
      }

      // Check embeds (for bot messages like Spidey Bot)
      if (message.embeds && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          // Check embed description
          if (embed.description) {
            const embedUrls = embed.description.match(WCL_URL_REGEX);
            if (embedUrls) {
              for (const url of embedUrls) {
                if (!logLinks.some((l) => l.url === url)) {
                  logLinks.push({
                    id: `${message.id}-${url}`,
                    url,
                    timestamp: message.timestamp,
                    author,
                    title: embed.title,
                  });
                }
              }
            }
          }

          // Check embed fields
          if (embed.fields) {
            for (const field of embed.fields) {
              const fieldUrls = (field.value || '').match(WCL_URL_REGEX);
              if (fieldUrls) {
                for (const url of fieldUrls) {
                  if (!logLinks.some((l) => l.url === url)) {
                    logLinks.push({
                      id: `${message.id}-${url}`,
                      url,
                      timestamp: message.timestamp,
                      author,
                      title: embed.title,
                    });
                  }
                }
              }
            }
          }

          // Check embed URL directly
          if (embed.url && WCL_URL_REGEX.test(embed.url)) {
            WCL_URL_REGEX.lastIndex = 0; // Reset regex
            if (!logLinks.some((l) => l.url === embed.url)) {
              logLinks.push({
                id: `${message.id}-${embed.url}`,
                url: embed.url,
                timestamp: message.timestamp,
                author,
                title: embed.title,
              });
            }
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
