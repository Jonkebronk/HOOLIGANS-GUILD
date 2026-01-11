import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - Find duplicate players
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Find all players
    const players = await prisma.player.findMany({
      where: teamId ? { teamId } : undefined,
      orderBy: { createdAt: 'asc' },
    });

    // Group by name (case insensitive)
    const nameGroups: Record<string, typeof players> = {};
    for (const player of players) {
      const key = player.name.toLowerCase();
      if (!nameGroups[key]) {
        nameGroups[key] = [];
      }
      nameGroups[key].push(player);
    }

    // Find duplicates (names that appear more than once)
    const duplicates = Object.entries(nameGroups)
      .filter(([, group]) => group.length > 1)
      .map(([name, group]) => ({
        name,
        count: group.length,
        players: group.map(p => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
      }));

    return NextResponse.json({
      totalPlayers: players.length,
      duplicateGroups: duplicates.length,
      duplicates,
    });
  } catch (error) {
    console.error('Failed to find duplicates:', error);
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}

// DELETE - Remove duplicate players (keeps the oldest one)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json({
        error: 'Add ?confirm=true to actually delete duplicates'
      }, { status: 400 });
    }

    // Find all players
    const players = await prisma.player.findMany({
      where: teamId ? { teamId } : undefined,
      orderBy: { createdAt: 'asc' },
    });

    // Group by name (case insensitive)
    const nameGroups: Record<string, typeof players> = {};
    for (const player of players) {
      const key = player.name.toLowerCase();
      if (!nameGroups[key]) {
        nameGroups[key] = [];
      }
      nameGroups[key].push(player);
    }

    // Delete duplicates (keep the oldest one)
    const toDelete: string[] = [];
    for (const [, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        // Keep the first (oldest), delete the rest
        for (let i = 1; i < group.length; i++) {
          toDelete.push(group[i].id);
        }
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ message: 'No duplicates found', deleted: 0 });
    }

    // Delete the duplicates
    const result = await prisma.player.deleteMany({
      where: { id: { in: toDelete } },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} duplicate players`,
      deleted: result.count,
      deletedIds: toDelete,
    });
  } catch (error) {
    console.error('Failed to delete duplicates:', error);
    return NextResponse.json({ error: 'Failed to delete duplicates' }, { status: 500 });
  }
}
