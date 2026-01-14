import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { auth } from '@/lib/auth';
import { requireOfficer } from '@/lib/auth-utils';

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

// Helper to check if user is GM/Officer based on Discord roles
function isOfficerOrGM(roleNames: string[]): { isGM: boolean; isOfficer: boolean } {
  const lowerRoles = roleNames.map(r => r.toLowerCase());
  const isGM = lowerRoles.some(name => name.includes('gm') || name.includes('guild master') || name.includes('guildmaster'));
  const isOfficer = isGM || lowerRoles.some(name => name.includes('officer') || name.includes('raid lead'));
  return { isGM, isOfficer };
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

    let discordRoles: string[] = [];
    let userIsOfficer = false;

    // Fetch Discord roles and auto-add user to matching teams
    if (user?.discordId) {
      discordRoles = await getUserDiscordRoles(user.discordId);
      console.log('User Discord roles:', discordRoles);

      const { isOfficer } = isOfficerOrGM(discordRoles);
      userIsOfficer = isOfficer;

      // Get all teams for debugging
      const allTeams = await prisma.team.findMany({ select: { id: true, name: true } });
      console.log('All teams in DB:', allTeams.map(t => t.name));

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
        console.log('Matching teams:', matchingTeams.map(t => t.name));

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

    // Officers/GM see ALL teams
    if (userIsOfficer) {
      const allTeams = await prisma.team.findMany({
        include: {
          _count: {
            select: { players: true, members: true },
          },
        },
      });

      const teams = allTeams.map(team => ({
        ...team,
        role: 'Admin', // Officers have admin access to all teams
        playerCount: team._count.players,
        memberCount: team._count.members,
      }));

      return NextResponse.json(teams);
    }

    // Regular users only see teams they're a member of
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

// PATCH /api/teams - Update team settings (officer only)
export async function PATCH(request: Request) {
  try {
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { teamId, softResUrl } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        softResUrl: softResUrl || null,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Failed to update team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}
