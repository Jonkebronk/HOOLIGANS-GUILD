import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Get loot records with items and redemptions
    const lootRecords = await prisma.lootRecord.findMany({
      where: teamId ? { teamId } : undefined,
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

    // Enrich loot records with BiS player info
    const enrichedRecords = lootRecords.map(record => {
      const bisPlayers: { id: string; name: string; class: string }[] = [];

      if (record.item) {
        // Check if item itself is BiS for any players
        if (record.item.wowheadId) {
          const players = bisPlayersByWowheadId.get(record.item.wowheadId) || [];
          bisPlayers.push(...players);
        }

        // For tokens, also check redemption items
        if (record.item.tokenRedemptions && record.item.tokenRedemptions.length > 0) {
          for (const redemption of record.item.tokenRedemptions) {
            if (redemption.redemptionItem.wowheadId) {
              const players = bisPlayersByWowheadId.get(redemption.redemptionItem.wowheadId) || [];
              for (const player of players) {
                if (!bisPlayers.find(p => p.id === player.id)) {
                  bisPlayers.push(player);
                }
              }
            }
          }
        }
      }

      return {
        ...record,
        bisPlayersFromList: bisPlayers,
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
