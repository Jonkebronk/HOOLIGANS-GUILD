import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { canAccessPlayer, requireOfficer } from '@/lib/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user can access this player
    const hasAccess = await canAccessPlayer(id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to fetch player:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require officer permission for editing
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, wowClass, mainSpec, offSpec, role, roleSubtype, notes, discordId, active } = body;

    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(wowClass !== undefined && { class: wowClass }),
        ...(mainSpec !== undefined && { mainSpec }),
        ...(offSpec !== undefined && { offSpec }),
        ...(role !== undefined && { role }),
        ...(roleSubtype !== undefined && { roleSubtype }),
        ...(notes !== undefined && { notes }),
        ...(discordId !== undefined && { discordId }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to update player:', error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require officer permission for deleting
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    await prisma.player.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
