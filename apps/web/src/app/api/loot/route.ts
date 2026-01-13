import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

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
    return NextResponse.json(lootRecords);
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
