import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_OFFICERS_ROLE_ID = process.env.DISCORD_OFFICERS_ROLE_ID;
const DISCORD_RAID_MANAGEMENT_CATEGORY_ID = process.env.DISCORD_RAID_MANAGEMENT_CATEGORY_ID;

// Discord permission flags
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const VIEW_AND_SEND = String(parseInt(VIEW_CHANNEL) | parseInt(SEND_MESSAGES)); // 3072

export async function POST(request: Request) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { playerId, raidPerformanceId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      );
    }

    // Get player with Discord ID
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        discordId: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    if (!player.discordId) {
      return NextResponse.json(
        { error: 'Player does not have a Discord ID linked' },
        { status: 400 }
      );
    }

    // Check if channel already exists for this player
    const existingChannel = await prisma.feedbackChannel.findFirst({
      where: {
        playerId: player.id,
        isArchived: false,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: 'Active feedback channel already exists for this player', channel: existingChannel },
        { status: 409 }
      );
    }

    // Build channel name (lowercase, replace spaces with dashes)
    const channelName = `feedback-${player.name.toLowerCase().replace(/\s+/g, '-')}`;

    // Build permission overwrites
    const permissionOverwrites = [
      {
        id: DISCORD_GUILD_ID, // @everyone
        type: 0, // role
        deny: VIEW_CHANNEL,
      },
      {
        id: player.discordId, // The specific player
        type: 1, // member
        allow: VIEW_AND_SEND,
      },
    ];

    // Add officers role if configured
    if (DISCORD_OFFICERS_ROLE_ID) {
      permissionOverwrites.push({
        id: DISCORD_OFFICERS_ROLE_ID,
        type: 0, // role
        allow: VIEW_AND_SEND,
      });
    }

    // Create the channel in Discord
    const channelData: {
      name: string;
      type: number;
      permission_overwrites: typeof permissionOverwrites;
      parent_id?: string;
      topic?: string;
    } = {
      name: channelName,
      type: 0, // GUILD_TEXT
      permission_overwrites: permissionOverwrites,
      topic: `Performance feedback for ${player.name}`,
    };

    // Add to category if configured
    if (DISCORD_RAID_MANAGEMENT_CATEGORY_ID) {
      channelData.parent_id = DISCORD_RAID_MANAGEMENT_CATEGORY_ID;
    }

    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData),
      }
    );

    if (!discordResponse.ok) {
      const error = await discordResponse.json();
      console.error('Discord API error:', error);
      console.error('Request data:', { channelName, permissionOverwrites, parent_id: DISCORD_RAID_MANAGEMENT_CATEGORY_ID });
      return NextResponse.json(
        {
          error: 'Failed to create Discord channel',
          details: error,
          discordError: error.message || error.code,
          hint: error.code === 50001 ? 'Bot lacks permissions - check Manage Channels permission' :
                error.code === 50013 ? 'Missing permissions to set overwrites' :
                error.code === 10003 ? 'Invalid category ID' :
                'Check bot permissions and env vars'
        },
        { status: discordResponse.status }
      );
    }

    const discordChannel = await discordResponse.json();

    // Save to database
    const feedbackChannel = await prisma.feedbackChannel.create({
      data: {
        playerId: player.id,
        discordChannelId: discordChannel.id,
        channelName,
        raidPerformanceId: raidPerformanceId || null,
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            class: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      channel: feedbackChannel,
      discordChannelId: discordChannel.id,
      discordChannelName: discordChannel.name,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create feedback channel:', error);
    return NextResponse.json(
      { error: 'Failed to create feedback channel' },
      { status: 500 }
    );
  }
}
