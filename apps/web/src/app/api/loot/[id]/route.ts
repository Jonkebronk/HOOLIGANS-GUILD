import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// PATCH - Update loot record (assign player, update response, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { playerId, response, lootPrio } = body;

    const updateData: Record<string, unknown> = {};

    if (playerId !== undefined) {
      updateData.playerId = playerId || null;
    }

    if (response !== undefined) {
      updateData.response = response || null;
    }

    if (lootPrio !== undefined) {
      updateData.lootPrio = lootPrio || null;
    }

    const lootRecord = await prisma.lootRecord.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            wowheadId: true,
            quality: true,
            icon: true,
            lootPriority: true,
            bisFor: true,
            bisNextPhase: true,
          },
        },
        player: true,
      },
    });

    return NextResponse.json(lootRecord);
  } catch (error) {
    console.error('Failed to update loot record:', error);
    return NextResponse.json({ error: 'Failed to update loot record' }, { status: 500 });
  }
}

// DELETE - Delete a loot record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.lootRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete loot record:', error);
    return NextResponse.json({ error: 'Failed to delete loot record' }, { status: 500 });
  }
}
