import { NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// GET /api/discord/members?roleId=xxx - Fetch members with a specific role
// GET /api/discord/members - Fetch all members
export async function GET(request: Request) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');

  try {
    // Fetch all guild members (paginated, max 1000 per request)
    // Note: Bot needs "Server Members Intent" enabled in Discord Developer Portal
    const allMembers: DiscordMember[] = [];
    let after = '0';
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`,
        {
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Discord API error:', error);

        // Check for specific error about intents
        if (error.code === 50001) {
          return NextResponse.json(
            { error: 'Bot lacks permissions. Enable "Server Members Intent" in Discord Developer Portal.' },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to fetch members' },
          { status: response.status }
        );
      }

      const members: DiscordMember[] = await response.json();

      if (members.length === 0) {
        hasMore = false;
      } else {
        allMembers.push(...members);
        after = members[members.length - 1].user.id;

        // Safety limit
        if (allMembers.length >= 5000) {
          hasMore = false;
        }
      }
    }

    // Filter by role if specified
    let filteredMembers = allMembers;
    if (roleId) {
      filteredMembers = allMembers.filter(member =>
        member.roles.includes(roleId)
      );
    }

    // Filter out bots and format response
    const formattedMembers = filteredMembers
      .filter(member => !member.user.bot)
      .map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatar: member.user.avatar
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
          : null,
        roles: member.roles,
        joinedAt: member.joined_at,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({
      members: formattedMembers,
      total: formattedMembers.length,
      roleId: roleId || null,
    });
  } catch (error) {
    console.error('Failed to fetch Discord members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

interface DiscordMember {
  user: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
  };
  nick?: string;
  roles: string[];
  joined_at: string;
}
