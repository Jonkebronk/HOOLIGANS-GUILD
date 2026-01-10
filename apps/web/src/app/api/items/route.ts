import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      include: {
        bisSpecs: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, wowheadId, slot, raid, boss, phase, lootPriority, bisSpecs } = body;

    const item = await prisma.item.create({
      data: {
        name,
        wowheadId,
        slot,
        raid,
        boss,
        phase,
        lootPriority,
        bisSpecs: bisSpecs ? {
          create: bisSpecs.map((spec: string) => ({ spec })),
        } : undefined,
      },
      include: {
        bisSpecs: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
