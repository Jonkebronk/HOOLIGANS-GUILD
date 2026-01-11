import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE /api/players/cleanup - Delete players
// ?teamId=xxx - Filter by team
// ?all=true - Delete ALL players (not just pending)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const deleteAll = searchParams.get('all') === 'true';

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Build where clause
    const whereClause = {
      teamId,
      ...(deleteAll ? {} : { name: { startsWith: 'Pending-' } }),
    };

    // Find players to delete
    const playersToDelete = await prisma.player.findMany({
      where: whereClause,
      select: { id: true, name: true },
    });

    if (playersToDelete.length === 0) {
      return NextResponse.json({
        message: deleteAll ? 'No players found' : 'No pending players found',
        deleted: 0
      });
    }

    // Delete players
    const result = await prisma.player.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({
      message: `Deleted ${result.count} players`,
      deleted: result.count,
      players: playersToDelete.map(p => p.name),
    });
  } catch (error) {
    console.error('Failed to cleanup players:', error);
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
  }
}
