import { NextResponse } from 'next/server';
import { prisma, GearSlot, Phase } from '@hooligans/database';
import { fetchWowheadIcon } from '@/lib/wowhead';

// GET - Retrieve player's custom BiS configuration
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const phase = searchParams.get('phase') || 'P1';

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing required parameter: playerId' },
        { status: 400 }
      );
    }

    const bisConfig = await prisma.playerBisConfiguration.findMany({
      where: {
        playerId,
        phase: phase as Phase,
      },
    });

    // Also fetch the actual item data for each BiS config and backfill missing icons
    const bisWithItems = await Promise.all(
      bisConfig.map(async (config) => {
        let item = null;
        if (config.wowheadId) {
          item = await prisma.item.findFirst({
            where: { wowheadId: config.wowheadId },
          });
        }

        // Backfill icon if missing
        let icon = config.icon || item?.icon;
        if (!icon && config.wowheadId) {
          icon = await fetchWowheadIcon(config.wowheadId);
          // Save for next time
          if (icon) {
            await prisma.playerBisConfiguration.update({
              where: { id: config.id },
              data: { icon },
            });
          }
        }

        return {
          ...config,
          icon,
          item: item ? { ...item, icon: item.icon || icon } : null,
        };
      })
    );

    return NextResponse.json(bisWithItems);
  } catch (error) {
    console.error('Player BiS config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player BiS configuration' },
      { status: 500 }
    );
  }
}

// POST - Save player's custom BiS configuration for a slot
export async function POST(request: Request) {
  try {
    const { playerId, phase, slot, itemId, wowheadId, itemName } = await request.json();

    if (!playerId || !phase || !slot) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, phase, slot' },
        { status: 400 }
      );
    }

    // Get item details from our database if itemId is provided
    const item = itemId ? await prisma.item.findUnique({
      where: { id: itemId },
    }) : null;

    // Determine final values - prefer itemId lookup, fall back to direct wowheadId/itemName
    const finalWowheadId = item?.wowheadId || wowheadId || null;
    const finalItemName = item?.name || itemName || '';
    const finalSource = item ? `${item.raid} - ${item.boss}` : 'TBC Item Database';

    // Get icon - from item first, then fetch from Wowhead if needed
    let finalIcon = item?.icon || null;
    if (!finalIcon && finalWowheadId) {
      finalIcon = await fetchWowheadIcon(finalWowheadId);
    }

    // Upsert the player BiS configuration
    const bisConfig = await prisma.playerBisConfiguration.upsert({
      where: {
        playerId_phase_slot: {
          playerId,
          phase: phase as Phase,
          slot: slot as GearSlot,
        },
      },
      update: {
        itemName: finalItemName,
        wowheadId: finalWowheadId,
        source: finalSource,
        icon: finalIcon,
      },
      create: {
        playerId,
        phase: phase as Phase,
        slot: slot as GearSlot,
        itemName: finalItemName,
        wowheadId: finalWowheadId,
        source: finalSource,
        icon: finalIcon,
      },
    });

    return NextResponse.json(bisConfig);
  } catch (error) {
    console.error('Player BiS config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save player BiS configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove player's BiS configuration for a slot
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const phase = searchParams.get('phase');
    const slot = searchParams.get('slot');

    if (!playerId || !phase || !slot) {
      return NextResponse.json(
        { error: 'Missing required parameters: playerId, phase, slot' },
        { status: 400 }
      );
    }

    await prisma.playerBisConfiguration.delete({
      where: {
        playerId_phase_slot: {
          playerId,
          phase: phase as Phase,
          slot: slot as GearSlot,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Player BiS config delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete player BiS configuration' },
      { status: 500 }
    );
  }
}
