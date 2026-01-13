import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// DELETE /api/items?raid=RaidName - Delete all items from a raid
export async function DELETE(request: Request) {
  try {
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

    // Create a map of wowheadId -> players who have it as BiS
    const bisPlayersByWowheadId = new Map<number, { id: string; name: string; class: string }[]>();
    for (const config of allBisConfigs) {
      if (config.wowheadId && config.player) {
        const existing = bisPlayersByWowheadId.get(config.wowheadId) || [];
        if (!existing.find(p => p.id === config.player.id)) {
          existing.push(config.player);
        }
        bisPlayersByWowheadId.set(config.wowheadId, existing);
      }
    }

    // Enrich items with BiS player info
    const enrichedItems = items.map(item => {
      const bisPlayersFromList: { id: string; name: string; class: string }[] = [];

      // Check if item itself is BiS for any players
      if (item.wowheadId) {
        const players = bisPlayersByWowheadId.get(item.wowheadId) || [];
        bisPlayersFromList.push(...players);
      }

      // For tokens, also check redemption items
      if (item.tokenRedemptions && item.tokenRedemptions.length > 0) {
        for (const redemption of item.tokenRedemptions) {
          if (redemption.redemptionItem.wowheadId) {
            const players = bisPlayersByWowheadId.get(redemption.redemptionItem.wowheadId) || [];
            for (const player of players) {
              if (!bisPlayersFromList.find(p => p.id === player.id)) {
                bisPlayersFromList.push(player);
              }
            }
          }
        }
      }

      return {
        ...item,
        bisPlayersFromList,
      };
    });

    return NextResponse.json(enrichedItems);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
