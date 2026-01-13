import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

type Needer = {
  playerId: string;
  name: string;
  class: string;
  hasReceived: boolean;
  receivedDate?: string;
};

type KarazhanItemWithNeeders = {
  id: string;
  name: string;
  wowheadId: number | null;
  icon: string | null;
  quality: number;
  boss: string;
  slot: string;
  needers: Needer[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId parameter' },
        { status: 400 }
      );
    }

    // Fetch all Karazhan items with their loot records
    const items = await prisma.item.findMany({
      where: {
        raid: 'Karazhan',
      },
      include: {
        lootRecords: {
          where: {
            teamId,
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                class: true,
              },
            },
          },
        },
      },
      orderBy: [
        { boss: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get all player BiS configurations for P1 filtered by team
    const bisConfigs = await prisma.playerBisConfiguration.findMany({
      where: {
        phase: 'P1',
        player: {
          teamId: teamId,
        },
      },
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
    for (const config of bisConfigs) {
      if (config.wowheadId && config.player) {
        const existing = bisPlayersByWowheadId.get(config.wowheadId) || [];
        if (!existing.find(p => p.id === config.player.id)) {
          existing.push(config.player);
        }
        bisPlayersByWowheadId.set(config.wowheadId, existing);
      }
    }

    // Process items to add needer information
    const itemsWithNeeders: KarazhanItemWithNeeders[] = items
      .map((item) => {
        // Get players who have this item as BiS from their lists
        const bisPlayers = item.wowheadId ? bisPlayersByWowheadId.get(item.wowheadId) || [] : [];

        // Build set of players who have received this item
        const receivedByPlayerId = new Set<string>();
        const receivedDates = new Map<string, string>();

        for (const record of item.lootRecords) {
          if (record.player) {
            receivedByPlayerId.add(record.player.id);
            receivedDates.set(record.player.id, record.lootDate.toISOString());
          }
        }

        // Build needers array with received status
        const needers: Needer[] = bisPlayers.map((player) => {
          const hasReceived = receivedByPlayerId.has(player.id);

          return {
            playerId: player.id,
            name: player.name,
            class: player.class,
            hasReceived,
            receivedDate: hasReceived ? receivedDates.get(player.id) : undefined,
          };
        });

        return {
          id: item.id,
          name: item.name,
          wowheadId: item.wowheadId,
          icon: item.icon,
          quality: item.quality,
          boss: item.boss,
          slot: item.slot,
          needers,
        };
      })
      .filter(item => item.needers.length > 0); // Only items with needers

    // Get unique bosses for filtering
    const bosses = [...new Set(items.map(i => i.boss))].sort();
    const slots = [...new Set(items.map(i => i.slot))].sort();

    return NextResponse.json({
      items: itemsWithNeeders,
      bosses,
      slots,
      totalItems: items.length,
      itemsWithNeeders: itemsWithNeeders.length,
    });
  } catch (error) {
    console.error('Failed to fetch Karazhan needs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Karazhan needs', details: String(error) },
      { status: 500 }
    );
  }
}
