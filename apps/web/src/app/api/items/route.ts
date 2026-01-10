import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE /api/items?raid=RaidName - Delete all items from a raid
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raid = searchParams.get('raid');

    if (!raid) {
      return NextResponse.json({ error: 'Raid parameter is required' }, { status: 400 });
    }

    // First delete related bisSpecs
    await prisma.itemBisSpec.deleteMany({
      where: {
        item: {
          raid: raid,
        },
      },
    });

    // Then delete items
    const result = await prisma.item.deleteMany({
      where: { raid: raid },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} items from ${raid}`
    });
  } catch (error) {
    console.error('Failed to delete items:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}

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
    const { name, wowheadId, icon, quality, slot, raid, boss, phase, lootPriority, bisSpecs } = body;

    const item = await prisma.item.create({
      data: {
        name,
        wowheadId,
        icon,
        quality: quality ?? 4, // Default to epic
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
