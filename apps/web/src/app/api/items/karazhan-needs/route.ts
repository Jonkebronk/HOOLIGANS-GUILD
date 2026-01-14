import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { SPEC_ROLES } from '@hooligans/shared';

type Needer = {
  playerId: string;
  name: string;
  class: string;
  hasReceived: boolean;
  receivedDate?: string;
};

type SpecNeeder = {
  spec: string;
  specDisplay: string;
  class: string;
  role: string;
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
  specNeeders?: SpecNeeder[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const isPuG = searchParams.get('isPuG') === 'true';

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

    // For PuG mode, get spec preset BiS data
    let specBisByWowheadId = new Map<number, SpecNeeder[]>();
    if (isPuG) {
      const specBisConfigs = await prisma.bisConfiguration.findMany({
        where: {
          phase: 'P1',
          wowheadId: { not: null },
        },
      });

      for (const config of specBisConfigs) {
        if (config.wowheadId) {
          const existing = specBisByWowheadId.get(config.wowheadId) || [];
          // Extract class from spec name (e.g., "DruidBalance" -> "Druid")
          const specClass = config.spec.replace(/(Balance|Feral|Guardian|Restoration|Dreamstate|BeastMastery|Marksmanship|Survival|Arcane|Fire|Frost|Holy|Protection|Retribution|Discipline|Shadow|Assassination|Combat|Subtlety|Elemental|Enhancement|Affliction|Demonology|Destruction|Arms|Fury|Kebab)$/, '');
          // Get display name (e.g., "DruidBalance" -> "Balance")
          const specName = config.spec.replace(specClass, '');
          // Get role from SPEC_ROLES
          const roleInfo = SPEC_ROLES[config.spec];
          const role = roleInfo?.role === 'Tank' ? 'Tank' : roleInfo?.role === 'Heal' ? 'Healer' : roleInfo?.subtype === 'DPS_Melee' ? 'Melee' : 'Ranged';

          if (!existing.find(s => s.spec === config.spec)) {
            existing.push({
              spec: config.spec,
              specDisplay: specName,
              class: specClass,
              role,
            });
          }
          specBisByWowheadId.set(config.wowheadId, existing);
        }
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

        // Get spec needers for PuG mode
        const specNeeders = isPuG && item.wowheadId
          ? specBisByWowheadId.get(item.wowheadId) || []
          : [];

        return {
          id: item.id,
          name: item.name,
          wowheadId: item.wowheadId,
          icon: item.icon,
          quality: item.quality,
          boss: item.boss,
          slot: item.slot,
          needers,
          specNeeders: isPuG ? specNeeders : undefined,
        };
      })
      // For PuG mode, show items with spec needers; for team mode, only show items with BiS needers
      .filter(item => isPuG ? (item.specNeeders && item.specNeeders.length > 0) : item.needers.length > 0);

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
