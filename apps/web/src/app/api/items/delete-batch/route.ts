import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE - Delete multiple items by IDs
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Item IDs array is required' }, { status: 400 });
    }

    // First delete related bisSpecs
    await prisma.itemBisSpec.deleteMany({
      where: {
        itemId: { in: ids },
      },
    });

    // Then delete items
    const result = await prisma.item.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} items`,
    });
  } catch (error) {
    console.error('Failed to delete items:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}
