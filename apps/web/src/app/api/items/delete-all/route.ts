import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE - Remove all items from database
export async function DELETE() {
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
