import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

// POST /api/admin/clear-sessions - Force logout all users
export async function POST() {
  try {
    // Only officers/GM can do this
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    // Delete all sessions
    const result = await prisma.session.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} sessions. All users will need to log in again.`,
      clearedCount: result.count,
    });
  } catch (error) {
    console.error('Failed to clear sessions:', error);
    return NextResponse.json({ error: 'Failed to clear sessions' }, { status: 500 });
  }
}
