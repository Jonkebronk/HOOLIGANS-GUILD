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
    const { channelId, imageData, title, playerDiscordIds } = await request.json();

    if (!channelId || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert base64 data URL to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Build message content with player mentions
    let messageContent = title || 'Raid Composition';
    if (playerDiscordIds && playerDiscordIds.length > 0) {
      const mentions = playerDiscordIds.map((id: string) => `<@${id}>`).join(' ');
      messageContent += `\n\n${mentions}`;
    }

    // Create form data for multipart upload
    const formData = new FormData();

    // Add the message payload as JSON
    const payload = {
      content: messageContent,
    };
    formData.append('payload_json', JSON.stringify(payload));

    // Add the image file
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('files[0]', blob, 'raid-composition.png');

    // Send to Discord
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Discord API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send message' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('Failed to send screenshot to Discord:', error);
    return NextResponse.json(
      { error: 'Failed to send screenshot' },
      { status: 500 }
    );
  }
}
