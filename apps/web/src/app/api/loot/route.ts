import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const history = searchParams.get('history') === 'true';

    // Get loot records with items and redemptions
    // By default, fetch only current session (non-finalized) items
    // Use ?history=true to fetch finalized (history) items
    const lootRecords = await prisma.lootRecord.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        finalized: history,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            wowheadId: true,
            quality: true,
            icon: true,
            slot: true,
            lootPriority: true,
            bisFor: true,
            bisNextPhase: true,
            tokenRedemptions: {
              include: {
                redemptionItem: {
                  select: {
                    id: true,
                    name: true,
                    wowheadId: true,
                    icon: true,
                    quality: true,
                    bisFor: true,
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
                      take: 3,
                    },
                  },
                },
              },
              orderBy: { className: 'asc' },
            },
          },
        },
        player: true,
      },
      orderBy: { lootDate: 'desc' },
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
        // P1 goes to current BiS, P2+ goes to next BiS
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
      item: typeof lootRecords[0]['item'],
      playerMap: Map<number, { id: string; name: string; class: string }[]>
    ) => {
      const players: { id: string; name: string; class: string }[] = [];

      if (!item) return players;

      // Check if item itself is BiS for any players
      if (item.wowheadId) {
        const itemPlayers = playerMap.get(item.wowheadId) || [];
        players.push(...itemPlayers);
      }

      // For tokens, also check redemption items
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

    // Enrich loot records with BiS player info
    const enrichedRecords = lootRecords.map(record => {
      return {
        ...record,
        bisPlayersFromList: getPlayersForItem(record.item, bisPlayersByWowheadId),
        bisNextPlayersFromList: getPlayersForItem(record.item, bisNextPlayersByWowheadId),
      };
    });

    return NextResponse.json(enrichedRecords, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to fetch loot records:', error);
    return NextResponse.json({ error: 'Failed to fetch loot records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Require officer permission for creating loot records
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, playerId, response, lootDate, phase, lootPoints, teamId } = body;

    const lootRecord = await prisma.lootRecord.create({
      data: {
        itemId,
        playerId: playerId || null,
        teamId: teamId || null,
        response: response || null,
        lootDate: lootDate ? new Date(lootDate) : new Date(),
        phase: phase || 'P5',
        lootPoints: lootPoints || 0,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            wowheadId: true,
            quality: true,
            icon: true,
            slot: true,
            lootPriority: true,
            bisFor: true,
            bisNextPhase: true,
            tokenRedemptions: {
              include: {
                redemptionItem: {
                  select: {
                    id: true,
                    name: true,
                    wowheadId: true,
                    icon: true,
                    quality: true,
                    bisFor: true,
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
                      take: 3,
                    },
                  },
                },
              },
              orderBy: { className: 'asc' },
            },
          },
        },
        player: true,
      },
    });

    return NextResponse.json(lootRecord, { status: 201 });
  } catch (error) {
    console.error('Failed to create loot record:', error);
    return NextResponse.json({ error: 'Failed to create loot record' }, { status: 500 });
  }
}
