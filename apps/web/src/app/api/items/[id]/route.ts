import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - Get single item with loot records
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
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
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to fetch item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PATCH - Update item (all fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, wowheadId, slot, phase, quality, boss, raid, lootPriority, bisFor, bisNextPhase } = body;

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (wowheadId !== undefined) updateData.wowheadId = typeof wowheadId === 'string' ? parseInt(wowheadId) : wowheadId;
    if (slot !== undefined) updateData.slot = slot;
    if (phase !== undefined) updateData.phase = phase;
    if (quality !== undefined) updateData.quality = typeof quality === 'string' ? parseInt(quality) : quality;
    if (boss !== undefined) updateData.boss = boss;
    if (raid !== undefined) updateData.raid = raid;
    if (lootPriority !== undefined) updateData.lootPriority = lootPriority;
    if (bisFor !== undefined) updateData.bisFor = bisFor;
    if (bisNextPhase !== undefined) updateData.bisNextPhase = bisNextPhase;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
