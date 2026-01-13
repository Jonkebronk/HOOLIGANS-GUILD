import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer, canAccessTeam } from '@/lib/auth-utils';

export async function DELETE(request: Request) {
  try {
    // Require officer permission for clearing session
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

    // Delete ALL loot records for this team (start fresh session)
    const result = await prisma.lootRecord.deleteMany({
      where: {
        teamId,
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Cleared ${result.count} items`,
    });
  } catch (error) {
    console.error('Failed to clear session:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
