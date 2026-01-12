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
        lootRecords: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                class: true,
              },
            },
          },
          orderBy: { lootDate: 'desc' },
          take: 5,
        },
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

    // Validate required fields
    if (!name || !wowheadId) {
      return NextResponse.json({ error: 'Name and Wowhead ID are required' }, { status: 400 });
    }

    if (!slot) {
      return NextResponse.json({ error: 'Slot is required' }, { status: 400 });
    }

    if (!raid) {
      return NextResponse.json({ error: 'Raid is required' }, { status: 400 });
    }

    if (!phase) {
      return NextResponse.json({ error: 'Phase is required' }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        name,
        wowheadId: typeof wowheadId === 'string' ? parseInt(wowheadId) : wowheadId,
        icon: icon || null,
        quality: quality ?? 4, // Default to epic
        slot,
        raid,
        boss: boss || 'Unknown', // Boss is required, default to Unknown
        phase,
        lootPriority: lootPriority || null,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create item: ${errorMessage}` }, { status: 500 });
  }
}
