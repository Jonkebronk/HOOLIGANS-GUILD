import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const splits = await prisma.raidSplit.findMany({
      where: { active: true },
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
