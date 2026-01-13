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

// Map raid IDs to raid numbers
const RAID_NUMBER_MAP: Record<string, number> = {
  'main-25': 0,
  'split-10-1': 1,
  'split-10-2': 2,
  'split-10-3': 3,
};

// PATCH - Update raid name
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { raidId, name, teamId } = body;

    if (!raidId || !name || !teamId) {
      return NextResponse.json({ error: 'raidId, name, and teamId are required' }, { status: 400 });
    }

    const raidNumber = RAID_NUMBER_MAP[raidId] ?? 0;

    // Find existing raid config
    let raidConfig = await prisma.raidSplit.findFirst({
      where: {
        raidNumber,
        teamId,
      },
    });

    if (raidConfig) {
      // Update existing
      raidConfig = await prisma.raidSplit.update({
        where: { id: raidConfig.id },
        data: { name },
      });
    } else {
      // Create new
      raidConfig = await prisma.raidSplit.create({
        data: {
          name,
          raidNumber,
          teamId,
        },
      });
    }

    return NextResponse.json(raidConfig);
  } catch (error) {
    console.error('Failed to update raid name:', error);
    return NextResponse.json({ error: 'Failed to update raid name' }, { status: 500 });
  }
}
