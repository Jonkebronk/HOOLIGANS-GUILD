import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

// DELETE - Remove all items from database
export async function DELETE() {
  // Require officer permission
  const { authorized, error } = await requireOfficer();
  if (!authorized) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  try {
    // First delete all BiS configurations that reference items
    await prisma.bisConfiguration.deleteMany({});

    // Delete all item BiS specs
    await prisma.itemBisSpec.deleteMany({});

    // Delete all loot records
    await prisma.lootRecord.deleteMany({});

    // Now delete all items
    const result = await prisma.item.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} items from database`,
    });
  } catch (error) {
    console.error('Delete all items error:', error);
    return NextResponse.json(
      { error: 'Failed to delete items: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
