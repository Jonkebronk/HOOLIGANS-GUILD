import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_OFFICERS_ROLE_ID = process.env.DISCORD_OFFICERS_ROLE_ID;

// Discord permission flags
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const VIEW_AND_SEND = String(parseInt(VIEW_CHANNEL) | parseInt(SEND_MESSAGES)); // 3072

export async function PATCH(request: Request) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { channelId, archive } = body;

    if (!channelId || typeof archive !== 'boolean') {
      return NextResponse.json(
        { error: 'channelId and archive (boolean) are required' },
        { status: 400 }
      );
    }

    // Get the feedback channel from database
    const feedbackChannel = await prisma.feedbackChannel.findFirst({
      where: { discordChannelId: channelId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            discordId: true,
          },
        },
      },
    });

    if (!feedbackChannel) {
      return NextResponse.json(
        { error: 'Feedback channel not found' },
        { status: 404 }
      );
    }

    if (archive) {
      // Archive: Deny all permissions to hide the channel
      const permissionOverwrites = [
        {
          id: DISCORD_GUILD_ID, // @everyone
          type: 0,
          deny: VIEW_CHANNEL,
        },
      ];

      // Update Discord channel permissions to hide from everyone
      const discordResponse = await fetch(
        `https://discord.com/api/v10/channels/${channelId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permission_overwrites: permissionOverwrites,
            name: `archived-${feedbackChannel.channelName}`,
          }),
        }
      );

      if (!discordResponse.ok) {
        const error = await discordResponse.json();
        console.error('Discord API error:', error);
        return NextResponse.json(
          { error: 'Failed to archive Discord channel', details: error },
          { status: discordResponse.status }
        );
      }

      // Update database
      const updated = await prisma.feedbackChannel.update({
        where: { id: feedbackChannel.id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        channel: updated,
        action: 'archived',
      });
    } else {
      // Unarchive: Restore permissions
      if (!feedbackChannel.player.discordId) {
        return NextResponse.json(
          { error: 'Player does not have a Discord ID linked' },
          { status: 400 }
        );
      }

      const permissionOverwrites = [
        {
          id: DISCORD_GUILD_ID, // @everyone
          type: 0,
          deny: VIEW_CHANNEL,
        },
        {
          id: feedbackChannel.player.discordId, // The specific player
          type: 1,
          allow: VIEW_AND_SEND,
        },
      ];

      // Add officers role if configured
      if (DISCORD_OFFICERS_ROLE_ID) {
        permissionOverwrites.push({
          id: DISCORD_OFFICERS_ROLE_ID,
          type: 0,
          allow: VIEW_AND_SEND,
        });
      }

      // Update Discord channel permissions to restore access
      const originalName = feedbackChannel.channelName.replace(/^archived-/, '');
      const discordResponse = await fetch(
        `https://discord.com/api/v10/channels/${channelId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permission_overwrites: permissionOverwrites,
            name: originalName,
          }),
        }
      );

      if (!discordResponse.ok) {
        const error = await discordResponse.json();
        console.error('Discord API error:', error);
        return NextResponse.json(
          { error: 'Failed to unarchive Discord channel', details: error },
          { status: discordResponse.status }
        );
      }

      // Update database
      const updated = await prisma.feedbackChannel.update({
        where: { id: feedbackChannel.id },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        channel: updated,
        action: 'unarchived',
      });
    }
  } catch (error) {
    console.error('Failed to archive/unarchive channel:', error);
    return NextResponse.json(
      { error: 'Failed to archive/unarchive channel' },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete the channel
export async function DELETE(request: Request) {
  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      );
    }

    // Delete from Discord
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!discordResponse.ok && discordResponse.status !== 404) {
      const error = await discordResponse.json();
      console.error('Discord API error:', error);
      return NextResponse.json(
        { error: 'Failed to delete Discord channel', details: error },
        { status: discordResponse.status }
      );
    }

    // Delete from database
    await prisma.feedbackChannel.deleteMany({
      where: { discordChannelId: channelId },
    });

    return NextResponse.json({
      success: true,
      action: 'deleted',
    });
  } catch (error) {
    console.error('Failed to delete channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    );
  }
}
