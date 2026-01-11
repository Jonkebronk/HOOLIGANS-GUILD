import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { auth } from '@/lib/auth';

// GET /api/teams - Get teams for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
