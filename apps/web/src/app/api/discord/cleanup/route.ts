import { NextRequest, NextResponse } from 'next/server';
import { requireOfficer } from '@/lib/auth-utils';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(request: NextRequest) {
  // Require officer permission
  const { authorized, error } = await requireOfficer();
  if (!authorized) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const { channelId, limit = 50 } = await request.json();

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing channelId' },
        { status: 400 }
      );
    }

    // First, get the bot's user ID
    const meResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get bot info' },
        { status: 500 }
      );
    }

    const botUser = await meResponse.json();
    const botId = botUser.id;

    // Get recent messages from the channel
    const messagesResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!messagesResponse.ok) {
      const error = await messagesResponse.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch messages' },
        { status: messagesResponse.status }
      );
    }

    const messages = await messagesResponse.json();

    // Filter messages sent by the bot
    const botMessages = messages.filter((msg: { author: { id: string } }) => msg.author.id === botId);

    if (botMessages.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No bot messages found to delete',
      });
    }

    // Delete each message
    let deleted = 0;
    const errors: string[] = [];

    for (const msg of botMessages) {
      try {
        const deleteResponse = await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages/${msg.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            },
          }
        );

        if (deleteResponse.ok || deleteResponse.status === 204) {
          deleted++;
        } else {
          const error = await deleteResponse.json().catch(() => ({ message: 'Unknown error' }));
          errors.push(`Failed to delete message ${msg.id}: ${error.message}`);
        }

        // Rate limit: Discord allows 5 requests per second for message deletion
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (err) {
        errors.push(`Error deleting message ${msg.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      total: botMessages.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deleted} of ${botMessages.length} bot messages`,
    });
  } catch (error) {
    console.error('Failed to cleanup Discord messages:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup messages' },
      { status: 500 }
    );
  }
}
