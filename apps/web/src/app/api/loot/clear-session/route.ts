import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId' },
        { status: 400 }
      );
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
