import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET all roster assignments
export async function GET() {
  try {
    const assignments = await prisma.rosterAssignment.findMany({
      include: {
        player: true,
      },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Failed to fetch roster assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch roster assignments' }, { status: 500 });
  }
}

// POST to save/update assignments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { raidId, groupIndex, slotIndex, playerId } = body;

    // Upsert the assignment
    const assignment = await prisma.rosterAssignment.upsert({
      where: {
        raidId_groupIndex_slotIndex: {
          raidId,
          groupIndex,
          slotIndex,
        },
      },
      update: {
        playerId,
      },
      create: {
        raidId,
        groupIndex,
        slotIndex,
        playerId,
      },
      include: {
        player: true,
      },
    });

    return NextResponse.json(assignment, { status: 200 });
  } catch (error) {
    console.error('Failed to save roster assignment:', error);
    return NextResponse.json({ error: 'Failed to save roster assignment' }, { status: 500 });
  }
}

// DELETE to remove an assignment or clear all for a raid
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raidId = searchParams.get('raidId');
    const groupIndex = searchParams.get('groupIndex');
    const slotIndex = searchParams.get('slotIndex');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      // Clear all assignments
      await prisma.rosterAssignment.deleteMany({});
      return NextResponse.json({ success: true, message: 'All assignments cleared' });
    }

    if (raidId && groupIndex !== null && slotIndex !== null) {
      // Delete specific slot assignment
      await prisma.rosterAssignment.delete({
        where: {
          raidId_groupIndex_slotIndex: {
            raidId,
            groupIndex: parseInt(groupIndex),
            slotIndex: parseInt(slotIndex),
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    if (raidId) {
      // Clear all assignments for a specific raid
      await prisma.rosterAssignment.deleteMany({
        where: { raidId },
      });
      return NextResponse.json({ success: true, message: `Cleared all assignments for ${raidId}` });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete roster assignment:', error);
    return NextResponse.json({ error: 'Failed to delete roster assignment' }, { status: 500 });
  }
}
