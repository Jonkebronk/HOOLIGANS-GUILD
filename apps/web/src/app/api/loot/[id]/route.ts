import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { canAccessTeam, requireOfficer } from '@/lib/auth-utils';

// PATCH - Update loot record (assign player, update response, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require officer permission for editing
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    // Verify loot record exists and check team access
    const existingRecord = await prisma.lootRecord.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'Loot record not found' }, { status: 404 });
    }

    if (existingRecord.teamId) {
      const hasAccess = await canAccessTeam(existingRecord.teamId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

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

    // Require officer permission for deleting
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    // Verify loot record exists and check team access
    const existingRecord = await prisma.lootRecord.findUnique({
      where: { id },
      select: { teamId: true },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'Loot record not found' }, { status: 404 });
    }

    if (existingRecord.teamId) {
      const hasAccess = await canAccessTeam(existingRecord.teamId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    await prisma.lootRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete loot record:', error);
    return NextResponse.json({ error: 'Failed to delete loot record' }, { status: 500 });
  }
}
