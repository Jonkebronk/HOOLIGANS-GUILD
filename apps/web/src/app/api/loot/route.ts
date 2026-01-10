import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const lootRecords = await prisma.lootRecord.findMany({
      include: {
        item: true,
        player: true,
      },
      orderBy: { lootDate: 'desc' },
    });
    return NextResponse.json(lootRecords);
  } catch (error) {
    console.error('Failed to fetch loot records:', error);
    return NextResponse.json({ error: 'Failed to fetch loot records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, playerId, response, lootDate, phase, lootPoints } = body;

    const lootRecord = await prisma.lootRecord.create({
      data: {
        itemId,
        playerId,
        response,
        lootDate: new Date(lootDate),
        phase,
        lootPoints,
      },
      include: {
        item: true,
        player: true,
      },
    });

    return NextResponse.json(lootRecord, { status: 201 });
  } catch (error) {
    console.error('Failed to create loot record:', error);
    return NextResponse.json({ error: 'Failed to create loot record' }, { status: 500 });
  }
}
