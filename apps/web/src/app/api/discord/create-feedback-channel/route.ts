import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_OFFICERS_ROLE_ID = process.env.DISCORD_OFFICERS_ROLE_ID;
const DISCORD_RAID_MANAGEMENT_CATEGORY_ID = process.env.DISCORD_RAID_MANAGEMENT_CATEGORY_ID;

// Strip angle brackets from Discord IDs (from Discord mention format like <@123456>)
function cleanDiscordId(id: string | undefined): string | undefined {
  if (!id) return id;
  return id.replace(/[<>@#&!]/g, '');
}

// Discord permission flags
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const VIEW_AND_SEND = String(parseInt(VIEW_CHANNEL) | parseInt(SEND_MESSAGES)); // 3072

export async function POST(request: Request) {
  // Clean all Discord IDs (remove angle brackets from mention format)
  const guildId = cleanDiscordId(DISCORD_GUILD_ID);
  const officersRoleId = cleanDiscordId(DISCORD_OFFICERS_ROLE_ID);
  const categoryId = cleanDiscordId(DISCORD_RAID_MANAGEMENT_CATEGORY_ID);

  if (!DISCORD_BOT_TOKEN || !guildId) {
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

    // Clean the player's Discord ID (remove angle brackets if present)
    const playerDiscordId = cleanDiscordId(player.discordId)!;

    // Validate discordId is a snowflake (numeric string, 17-20 digits)
    const isValidSnowflake = /^\d{17,20}$/.test(playerDiscordId);
    if (!isValidSnowflake) {
      return NextResponse.json(
        {
          error: 'Invalid Discord ID format',
          hint: `Player "${player.name}" has discordId "${player.discordId}" (cleaned: "${playerDiscordId}") which is not a valid Discord user ID. Discord IDs should be 17-20 digit numbers.`,
          details: 'The player may need to be re-imported from Discord with their actual user ID.'
        },
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

    // Build channel name (lowercase, only alphanumeric and dashes, max 100 chars)
    const sanitizedName = player.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with dashes
      .replace(/-+/g, '-')           // Collapse multiple dashes
      .replace(/^-|-$/g, '');        // Remove leading/trailing dashes
    const channelName = `feedback-${sanitizedName}`.slice(0, 100);

    // Build permission overwrites - Discord requires both allow and deny as strings
    const permissionOverwrites: Array<{
      id: string;
      type: number;
      allow: string;
      deny: string;
    }> = [
      {
        id: guildId, // @everyone
        type: 0, // role
        allow: '0',
        deny: VIEW_CHANNEL,
      },
      {
        id: playerDiscordId, // The specific player
        type: 1, // member
        allow: VIEW_AND_SEND,
        deny: '0',
      },
    ];

    // Add officers role if configured
    if (officersRoleId) {
      permissionOverwrites.push({
        id: officersRoleId,
        type: 0, // role
        allow: VIEW_AND_SEND,
        deny: '0',
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
    if (categoryId) {
      channelData.parent_id = categoryId;
    }

    console.log('Creating Discord channel:', JSON.stringify(channelData, null, 2));

    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
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
      console.error('Discord API error:', JSON.stringify(error, null, 2));
      console.error('Request data:', JSON.stringify(channelData, null, 2));

      // Parse Discord's detailed errors
      let detailedHint = 'Check bot permissions and env vars';
      if (error.code === 50001) {
        detailedHint = 'Bot lacks permissions - check Manage Channels permission';
      } else if (error.code === 50013) {
        detailedHint = 'Missing permissions to set overwrites';
      } else if (error.code === 10003) {
        detailedHint = 'Invalid category ID';
      } else if (error.code === 50035) {
        // Invalid Form Body - parse the errors object
        const errorDetails = error.errors ? JSON.stringify(error.errors) : 'Unknown field error';
        detailedHint = `Invalid Form Body: ${errorDetails}`;
      }

      return NextResponse.json(
        {
          error: 'Failed to create Discord channel',
          hint: detailedHint,
          details: error.message || JSON.stringify(error),
          discordCode: error.code,
          requestData: {
            channelName,
            playerDiscordId,
            guildId,
            categoryId: categoryId || 'not set',
          }
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
