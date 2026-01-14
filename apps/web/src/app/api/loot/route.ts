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
            sunmoteRedemption: {
              include: {
                upgradedItem: {
                  select: {
                    id: true,
                    name: true,
                    wowheadId: true,
                    icon: true,
                    quality: true,
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

      // For sunmote items, check upgraded item
      const sunmoteItem = item as typeof item & {
        sunmoteRedemption?: { upgradedItem?: { wowheadId?: number } };
      };
      if (sunmoteItem.sunmoteRedemption?.upgradedItem?.wowheadId) {
        const sunmotePlayers = playerMap.get(sunmoteItem.sunmoteRedemption.upgradedItem.wowheadId) || [];
        for (const player of sunmotePlayers) {
          if (!players.find(p => p.id === player.id)) {
            players.push(player);
          }
        }
      }

      return players;
    };

    // Collect ALL item IDs (base items + redemption items + sunmote upgrades)
    const allItemIds = new Set<string>();
    const itemToRelatedIds = new Map<string, Set<string>>(); // base item -> all related item IDs

    for (const record of lootRecords) {
      if (!record.item?.id) continue;

      const baseId = record.item.id;
      allItemIds.add(baseId);

      if (!itemToRelatedIds.has(baseId)) {
        itemToRelatedIds.set(baseId, new Set([baseId]));
      }

      // Add token redemption items
      if (record.item.tokenRedemptions) {
        for (const redemption of record.item.tokenRedemptions) {
          if (redemption.redemptionItem?.id) {
            allItemIds.add(redemption.redemptionItem.id);
            itemToRelatedIds.get(baseId)!.add(redemption.redemptionItem.id);
          }
        }
      }

      // Add sunmote upgraded item
      const sunmoteItem = record.item as typeof record.item & {
        sunmoteRedemption?: { upgradedItem?: { id?: string } };
      };
      if (sunmoteItem.sunmoteRedemption?.upgradedItem?.id) {
        allItemIds.add(sunmoteItem.sunmoteRedemption.upgradedItem.id);
        itemToRelatedIds.get(baseId)!.add(sunmoteItem.sunmoteRedemption.upgradedItem.id);
      }
    }

    // Fetch all finalized loot records for ALL related items
    const finalizedLoot = await prisma.lootRecord.findMany({
      where: {
        itemId: { in: [...allItemIds] },
        finalized: true,
        playerId: { not: null },
        ...(teamId ? { teamId } : {}),
      },
      select: {
        itemId: true,
        playerId: true,
      },
    });

    // Create a map of itemId -> Set of playerIds who have that item
    const itemToPlayers = new Map<string, Set<string>>();
    for (const record of finalizedLoot) {
      if (record.itemId && record.playerId) {
        if (!itemToPlayers.has(record.itemId)) {
          itemToPlayers.set(record.itemId, new Set());
        }
        itemToPlayers.get(record.itemId)!.add(record.playerId);
      }
    }

    // Helper to get all players who have ANY related item
    const getPlayersWithRelatedItems = (baseItemId: string): Set<string> => {
      const players = new Set<string>();
      const relatedIds = itemToRelatedIds.get(baseItemId);
      if (relatedIds) {
        for (const id of relatedIds) {
          const itemPlayers = itemToPlayers.get(id);
          if (itemPlayers) {
            for (const playerId of itemPlayers) {
              players.add(playerId);
            }
          }
        }
      }
      return players;
    };

    // Also track players assigned in current session (not yet finalized)
    // If a player is assigned to get an item in current drops, hide them from BiS for that item
    const currentSessionAssignments = new Map<string, Set<string>>(); // itemId -> playerIds assigned
    for (const record of lootRecords) {
      if (record.item?.id && record.playerId && !record.finalized) {
        if (!currentSessionAssignments.has(record.item.id)) {
          currentSessionAssignments.set(record.item.id, new Set());
        }
        currentSessionAssignments.get(record.item.id)!.add(record.playerId);
      }
    }

    // Enrich loot records with BiS player info (excluding players who already have the item or are assigned)
    const enrichedRecords = lootRecords.map(record => {
      const lootedPlayerIds = record.item?.id ? getPlayersWithRelatedItems(record.item.id) : new Set<string>();

      // Also add players assigned in current session
      const assignedPlayerIds = record.item?.id ? currentSessionAssignments.get(record.item.id) : undefined;

      const bisPlayers = getPlayersForItem(record.item, bisPlayersByWowheadId)
        .filter(player => !lootedPlayerIds.has(player.id) && !assignedPlayerIds?.has(player.id));
      const bisNextPlayers = getPlayersForItem(record.item, bisNextPlayersByWowheadId)
        .filter(player => !lootedPlayerIds.has(player.id) && !assignedPlayerIds?.has(player.id));

      return {
        ...record,
        bisPlayersFromList: bisPlayers,
        bisNextPlayersFromList: bisNextPlayers,
      };
    });

    return NextResponse.json(enrichedRecords);
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
            sunmoteRedemption: {
              include: {
                upgradedItem: {
                  select: {
                    id: true,
                    name: true,
                    wowheadId: true,
                    icon: true,
                    quality: true,
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
