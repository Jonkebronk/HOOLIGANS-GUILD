import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const splits = await prisma.raidSplit.findMany({
      where: {
        active: true,
        ...(teamId ? { teamId } : {}),
      },
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { raidNumber: 'asc' },
    });
    return NextResponse.json(splits);
  } catch (error) {
    console.error('Failed to fetch raid splits:', error);
    return NextResponse.json({ error: 'Failed to fetch raid splits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, raidNumber } = body;

    const split = await prisma.raidSplit.create({
      data: {
        name,
        raidNumber,
      },
    });

    return NextResponse.json(split, { status: 201 });
  } catch (error) {
    console.error('Failed to create raid split:', error);
    return NextResponse.json({ error: 'Failed to create raid split' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { splitId, members } = body;

    // Clear existing members and add new ones
    await prisma.raidSplitMember.deleteMany({
      where: { splitId },
    });

    if (members && members.length > 0) {
      await prisma.raidSplitMember.createMany({
        data: members.map((m: { playerId: string; role: string }) => ({
          splitId,
          playerId: m.playerId,
          role: m.role,
        })),
      });
    }

    const updatedSplit = await prisma.raidSplit.findUnique({
      where: { id: splitId },
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSplit);
  } catch (error) {
    console.error('Failed to update raid split:', error);
    return NextResponse.json({ error: 'Failed to update raid split' }, { status: 500 });
  }
}

// PATCH - Update raid name
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { raidId, name, teamId } = body;

    if (!raidId || !name) {
      return NextResponse.json({ error: 'raidId and name are required' }, { status: 400 });
    }

    // Check if this raid config exists for the team
    let raidConfig = await prisma.raidSplit.findFirst({
      where: {
        id: raidId,
        teamId: teamId || null,
      },
    });

    if (raidConfig) {
      // Update existing
      raidConfig = await prisma.raidSplit.update({
        where: { id: raidConfig.id },
        data: { name },
      });
    } else {
      // Try to find by raidNumber pattern (for legacy support)
      const raidNumberMatch = raidId.match(/(\d+)$/);
      const raidNumber = raidNumberMatch ? parseInt(raidNumberMatch[1]) : 1;

      // Create new raid config
      raidConfig = await prisma.raidSplit.create({
        data: {
          id: raidId,
          name,
          raidNumber,
          teamId: teamId || null,
        },
      });
    }

    return NextResponse.json(raidConfig);
  } catch (error) {
    console.error('Failed to update raid name:', error);
    return NextResponse.json({ error: 'Failed to update raid name' }, { status: 500 });
  }
}
