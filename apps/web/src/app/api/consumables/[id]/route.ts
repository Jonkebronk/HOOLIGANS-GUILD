import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE - Remove a consumable
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // This will cascade delete all spec configs due to onDelete: Cascade
    await prisma.consumable.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete consumable:', error);
    return NextResponse.json(
      { error: 'Failed to delete consumable' },
      { status: 500 }
    );
  }
}
