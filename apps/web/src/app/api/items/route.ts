import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

// DELETE /api/items?raid=RaidName - Delete all items from a raid
export async function DELETE(request: Request) {
  try {
    // Require officer permission for deleting items
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const raid = searchParams.get('raid');

    if (!raid) {
      return NextResponse.json({ error: 'Raid parameter is required' }, { status: 400 });
    }

    // First delete related bisSpecs
    await prisma.itemBisSpec.deleteMany({
      where: {
        item: {
          raid: raid,
        },
      },
    });

    // Then delete items
    const result = await prisma.item.deleteMany({
      where: { raid: raid },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} items from ${raid}`
    });
  } catch (error) {
    console.error('Failed to delete items:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const items = await prisma.item.findMany({
      include: {
        bisSpecs: true,
        lootRecords: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                class: true,
              },
            },
          },
          orderBy: { lootDate: 'desc' },
          take: 5,
        },
        tokenRedemptions: {
          include: {
            redemptionItem: {
              select: {
                id: true,
                wowheadId: true,
              },
            },
          },
        },
        sunmoteRedemption: {
          include: {
            upgradedItem: {
              select: {
                id: true,
                wowheadId: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get player BiS configurations filtered by team (all phases)
    const allBisConfigs = await prisma.playerBisConfiguration.findMany({
      where: teamId ? {
        player: {
          teamId: teamId,
        },
      } : undefined,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            class: true,
          },
        },
      },
    });

    // Create separate maps for current phase (P1) and next phases (P2+)
    const bisPlayersByWowheadId = new Map<number, { id: string; name: string; class: string }[]>();
    const bisNextPlayersByWowheadId = new Map<number, { id: string; name: string; class: string }[]>();

    for (const config of allBisConfigs) {
      if (config.wowheadId && config.player) {
        const targetMap = config.phase === 'P1' ? bisPlayersByWowheadId : bisNextPlayersByWowheadId;
        const existing = targetMap.get(config.wowheadId) || [];
        if (!existing.find(p => p.id === config.player.id)) {
          existing.push(config.player);
        }
        targetMap.set(config.wowheadId, existing);
      }
    }

    // Helper to get players from a map for an item
    const getPlayersForItem = (
      item: typeof items[0],
      playerMap: Map<number, { id: string; name: string; class: string }[]>
    ) => {
      const players: { id: string; name: string; class: string }[] = [];

      if (item.wowheadId) {
        const itemPlayers = playerMap.get(item.wowheadId) || [];
        players.push(...itemPlayers);
      }

      if (item.tokenRedemptions && item.tokenRedemptions.length > 0) {
        for (const redemption of item.tokenRedemptions) {
          if (redemption.redemptionItem.wowheadId) {
            const redemptionPlayers = playerMap.get(redemption.redemptionItem.wowheadId) || [];
            for (const player of redemptionPlayers) {
              if (!players.find(p => p.id === player.id)) {
                players.push(player);
              }
            }
          }
        }
      }

      return players;
    };

    // Enrich items with BiS player info
    const enrichedItems = items.map(item => {
      return {
        ...item,
        bisPlayersFromList: getPlayersForItem(item, bisPlayersByWowheadId),
        bisNextPlayersFromList: getPlayersForItem(item, bisNextPlayersByWowheadId),
      };
    });

    return NextResponse.json(enrichedItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Require officer permission for creating items
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, wowheadId, icon, quality, slot, raid, boss, phase, lootPriority, bisSpecs } = body;

    // Validate required fields
    if (!name || !wowheadId) {
      return NextResponse.json({ error: 'Name and Wowhead ID are required' }, { status: 400 });
    }

    if (!slot) {
      return NextResponse.json({ error: 'Slot is required' }, { status: 400 });
    }

    if (!raid) {
      return NextResponse.json({ error: 'Raid is required' }, { status: 400 });
    }

    if (!phase) {
      return NextResponse.json({ error: 'Phase is required' }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        name,
        wowheadId: typeof wowheadId === 'string' ? parseInt(wowheadId) : wowheadId,
        icon: icon || null,
        quality: quality ?? 4, // Default to epic
        slot,
        raid,
        boss: boss || 'Unknown', // Boss is required, default to Unknown
        phase,
        lootPriority: lootPriority || null,
        bisSpecs: bisSpecs ? {
          create: bisSpecs.map((spec: string) => ({ spec })),
        } : undefined,
      },
      include: {
        bisSpecs: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create item: ${errorMessage}` }, { status: 500 });
  }
}
