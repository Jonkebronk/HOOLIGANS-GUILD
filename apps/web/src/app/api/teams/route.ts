import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { auth } from '@/lib/auth';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Helper to fetch user's Discord roles
async function getUserDiscordRoles(discordId: string): Promise<string[]> {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !discordId) {
    return [];
  }

  try {
    // Fetch member from Discord
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!memberRes.ok) return [];

    const member = await memberRes.json();
    const memberRoleIds: string[] = member.roles || [];

    // Fetch all guild roles
    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!rolesRes.ok) return [];

    const allRoles = await rolesRes.json();

    // Return role names the user has
    return allRoles
      .filter((role: { id: string; name: string }) =>
        memberRoleIds.includes(role.id) && role.name !== '@everyone'
      )
      .map((role: { name: string }) => role.name);
  } catch (error) {
    console.error('Failed to fetch Discord roles:', error);
    return [];
  }
}

// GET /api/teams - Get teams for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Discord ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true },
    });

    // Fetch Discord roles and auto-add user to matching teams
    if (user?.discordId) {
      const discordRoles = await getUserDiscordRoles(user.discordId);

      if (discordRoles.length > 0) {
        // Find teams that match Discord role names (case-insensitive)
        const matchingTeams = await prisma.team.findMany({
          where: {
            name: {
              in: discordRoles,
              mode: 'insensitive',
            },
          },
          select: { id: true, name: true },
        });

        // Auto-add user to matching teams they're not already in
        for (const team of matchingTeams) {
          const existingMember = await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: team.id,
                userId: session.user.id,
              },
            },
          });

          if (!existingMember) {
            await prisma.teamMember.create({
              data: {
                teamId: team.id,
                userId: session.user.id,
                role: 'Member',
              },
            });
            console.log(`Auto-added user ${session.user.id} to team ${team.name} based on Discord role`);
          }
        }
      }
    }

    // Get all teams the user is a member of
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            _count: {
              select: { players: true, members: true },
            },
          },
        },
      },
    });

    const teams = teamMembers.map(tm => ({
      ...tm.team,
      role: tm.role,
      playerCount: tm.team._count.players,
      memberCount: tm.team._count.members,
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Create team and add user as owner
    const team = await prisma.team.create({
      data: {
        name,
        description,
        icon,
        members: {
          create: {
            userId: session.user.id,
            role: 'Owner',
          },
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Failed to create team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
