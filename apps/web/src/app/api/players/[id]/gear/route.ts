import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { fetchWowheadIcon } from '@/lib/wowhead';

// GET /api/players/[id]/gear - Get all current gear for a player
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const gear = await prisma.playerGear.findMany({
      where: { playerId: id },
      include: {
        item: true,
      },
      orderBy: { slot: 'asc' },
    });

    // Backfill missing icons
    const gearWithIcons = await Promise.all(
      gear.map(async (g) => {
        let icon = g.icon || g.item?.icon;
        if (!icon && g.wowheadId) {
          icon = await fetchWowheadIcon(g.wowheadId);
          // Save for next time
          if (icon) {
            await prisma.playerGear.update({
              where: { id: g.id },
              data: { icon },
            });
          }
        }
        return { ...g, icon };
      })
    );

    return NextResponse.json(gearWithIcons);
  } catch (error) {
    console.error('Failed to fetch player gear:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player gear' },
      { status: 500 }
    );
  }
}

// PUT /api/players/[id]/gear - Update a single gear slot
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { slot, itemId, wowheadId, itemName, icon, enchantId, gem1Id, gem2Id, gem3Id } = body;

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot is required' },
        { status: 400 }
      );
    }

    // Fetch icon from Wowhead if not provided but wowheadId is
    let finalIcon = icon || null;
    if (!finalIcon && wowheadId) {
      finalIcon = await fetchWowheadIcon(wowheadId);
    }

    // Upsert the gear slot
    const gear = await prisma.playerGear.upsert({
      where: {
        playerId_slot: {
          playerId: id,
          slot: slot,
        },
      },
      update: {
        itemId: itemId || null,
        wowheadId: wowheadId || null,
        itemName: itemName || null,
        icon: finalIcon,
        enchantId: enchantId || null,
        gem1Id: gem1Id || null,
        gem2Id: gem2Id || null,
        gem3Id: gem3Id || null,
      },
      create: {
        playerId: id,
        slot: slot,
        itemId: itemId || null,
        wowheadId: wowheadId || null,
        itemName: itemName || null,
        icon: finalIcon,
        enchantId: enchantId || null,
        gem1Id: gem1Id || null,
        gem2Id: gem2Id || null,
        gem3Id: gem3Id || null,
      },
      include: {
        item: true,
      },
    });

    return NextResponse.json(gear);
  } catch (error) {
    console.error('Failed to update player gear:', error);
    return NextResponse.json(
      { error: 'Failed to update player gear' },
      { status: 500 }
    );
  }
}

// DELETE /api/players/[id]/gear - Clear a gear slot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slot = searchParams.get('slot');

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot query parameter is required' },
        { status: 400 }
      );
    }

    await prisma.playerGear.delete({
      where: {
        playerId_slot: {
          playerId: id,
          slot: slot as any,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete player gear:', error);
    return NextResponse.json(
      { error: 'Failed to delete player gear' },
      { status: 500 }
    );
  }
}
