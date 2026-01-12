import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { SPEC_SHORT_NAME_TO_CLASS } from '@/lib/specs';

type Needer = {
  playerId: string | null;
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

    // Fetch all players for the team to match names
    const players = await prisma.player.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        class: true,
      },
    });

    // Create a map of player names to player data (case-insensitive)
    const playerByName = new Map<string, { id: string; name: string; class: string }>();
    for (const player of players) {
      playerByName.set(player.name.toLowerCase(), player);
    }

    // Process items to add needer information
    const itemsWithNeeders: KarazhanItemWithNeeders[] = items
      .filter(item => item.bisFor && item.bisFor.trim() !== '') // Only items with needers
      .map((item) => {
        // Parse bisFor field (comma-separated player names)
        const neederNames = item.bisFor
          ? item.bisFor.split(',').map(n => n.trim()).filter(Boolean)
          : [];

        // Build set of players who have received this item
        const receivedByPlayerName = new Set<string>();
        const receivedDates = new Map<string, string>();

        for (const record of item.lootRecords) {
          if (record.player) {
            receivedByPlayerName.add(record.player.name.toLowerCase());
            receivedDates.set(
              record.player.name.toLowerCase(),
              record.lootDate.toISOString()
            );
          }
        }

        // Build needers array with received status
        const needers: Needer[] = neederNames.map((name) => {
          const playerData = playerByName.get(name.toLowerCase());
          const hasReceived = receivedByPlayerName.has(name.toLowerCase());

          // Check if this is a spec short name (from BiS sync) or a player name
          const specClass = SPEC_SHORT_NAME_TO_CLASS[name];

          return {
            playerId: playerData?.id || null,
            name: playerData?.name || name, // Use actual player name if found
            class: specClass || playerData?.class || 'Unknown',
            hasReceived,
            receivedDate: hasReceived ? receivedDates.get(name.toLowerCase()) : undefined,
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
      });

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
