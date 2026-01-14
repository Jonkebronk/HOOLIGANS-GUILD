import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

// GET - Get single item with loot records
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
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
          take: 20,
        },
        tokenRedemptions: {
          include: {
            redemptionItem: {
              include: {
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
              },
            },
          },
          orderBy: { className: 'asc' },
        },
        sunmoteRedemption: {
          include: {
            upgradedItem: {
              include: {
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
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get player BiS configurations filtered by team
    let allBisConfigs: { phase: string; player: { id: string; name: string; class: string } }[] = [];
    if (item.wowheadId) {
      allBisConfigs = await prisma.playerBisConfiguration.findMany({
        where: {
          ...(teamId ? { player: { teamId } } : {}),
          wowheadId: item.wowheadId,
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
    }

    // Also check redemption items for tokens
    const redemptionWowheadIds = item.tokenRedemptions
      ?.map(r => r.redemptionItem?.wowheadId)
      .filter((id): id is number => id !== null && id !== undefined) || [];

    let redemptionBisConfigs: { phase: string; player: { id: string; name: string; class: string } }[] = [];
    if (redemptionWowheadIds.length > 0) {
      redemptionBisConfigs = await prisma.playerBisConfiguration.findMany({
        where: {
          ...(teamId ? { player: { teamId } } : {}),
          wowheadId: { in: redemptionWowheadIds },
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
    }

    // Also check sunmote upgraded item
    let sunmoteBisConfigs: { phase: string; player: { id: string; name: string; class: string } }[] = [];
    const sunmoteUpgradedWowheadId = (item as { sunmoteRedemption?: { upgradedItem?: { wowheadId?: number } } })
      .sunmoteRedemption?.upgradedItem?.wowheadId;
    if (sunmoteUpgradedWowheadId) {
      sunmoteBisConfigs = await prisma.playerBisConfiguration.findMany({
        where: {
          ...(teamId ? { player: { teamId } } : {}),
          wowheadId: sunmoteUpgradedWowheadId,
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
    }

    // Combine all BiS configs
    const combinedConfigs = [...allBisConfigs, ...redemptionBisConfigs, ...sunmoteBisConfigs];

    // Separate by phase
    const bisPlayersFromList: { id: string; name: string; class: string }[] = [];
    const bisNextPlayersFromList: { id: string; name: string; class: string }[] = [];

    for (const config of combinedConfigs) {
      if (config.player) {
        const targetList = config.phase === 'P1' ? bisPlayersFromList : bisNextPlayersFromList;
        if (!targetList.find(p => p.id === config.player.id)) {
          targetList.push(config.player);
        }
      }
    }

    return NextResponse.json({
      ...item,
      bisPlayersFromList,
      bisNextPlayersFromList,
    });
  } catch (error) {
    console.error('Failed to fetch item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PATCH - Update item (all fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require officer permission for editing items
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { name, wowheadId, slot, phase, quality, boss, raid, lootPriority, bisFor, bisNextPhase } = body;

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (wowheadId !== undefined) updateData.wowheadId = typeof wowheadId === 'string' ? parseInt(wowheadId) : wowheadId;
    if (slot !== undefined) updateData.slot = slot;
    if (phase !== undefined) updateData.phase = phase;
    if (quality !== undefined) updateData.quality = typeof quality === 'string' ? parseInt(quality) : quality;
    if (boss !== undefined) updateData.boss = boss;
    if (raid !== undefined) updateData.raid = raid;
    if (lootPriority !== undefined) updateData.lootPriority = lootPriority;
    if (bisFor !== undefined) updateData.bisFor = bisFor;
    if (bisNextPhase !== undefined) updateData.bisNextPhase = bisNextPhase;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
