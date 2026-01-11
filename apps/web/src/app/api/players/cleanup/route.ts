import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE /api/players/cleanup - Delete all pending players
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Find pending players
    const pending = await prisma.player.findMany({
      where: {
        name: { startsWith: 'Pending-' },
        ...(teamId && { teamId }),
      },
      select: { id: true, name: true },
    });

    if (pending.length === 0) {
      return NextResponse.json({ message: 'No pending players found', deleted: 0 });
    }

    // Delete pending players
    const result = await prisma.player.deleteMany({
      where: {
        name: { startsWith: 'Pending-' },
        ...(teamId && { teamId }),
      },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} pending players`,
      deleted: result.count,
      players: pending.map(p => p.name),
    });
  } catch (error) {
    console.error('Failed to cleanup pending players:', error);
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
  }
}
