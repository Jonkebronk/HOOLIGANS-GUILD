import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

export async function DELETE(request: Request) {
  // Require officer permission
  const { authorized, error } = await requireOfficer();
  if (!authorized) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId' },
        { status: 400 }
      );
    }

    // Delete all unassigned loot records for this team
    const result = await prisma.lootRecord.deleteMany({
      where: {
        teamId,
        playerId: null,
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Cleared ${result.count} unassigned items`,
    });
  } catch (error) {
    console.error('Failed to clear unassigned items:', error);
    return NextResponse.json(
      { error: 'Failed to clear unassigned items' },
      { status: 500 }
    );
  }
}
