import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer, canAccessTeam } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    // Require officer permission for finalizing session
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId' },
        { status: 400 }
      );
    }

    // Verify team access
    const hasAccess = await canAccessTeam(teamId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mark all assigned (non-finalized) items as finalized
    const finalizedResult = await prisma.lootRecord.updateMany({
      where: {
        teamId,
        finalized: false,
        playerId: { not: null },
      },
      data: {
        finalized: true,
      },
    });

    // Delete all unassigned items
    const deletedResult = await prisma.lootRecord.deleteMany({
      where: {
        teamId,
        finalized: false,
        playerId: null,
      },
    });

    return NextResponse.json({
      finalized: finalizedResult.count,
      deleted: deletedResult.count,
      message: `Finalized ${finalizedResult.count} items, cleared ${deletedResult.count} unassigned items`,
    });
  } catch (error) {
    console.error('Failed to finalize session:', error);
    return NextResponse.json(
      { error: 'Failed to finalize session' },
      { status: 500 }
    );
  }
}
