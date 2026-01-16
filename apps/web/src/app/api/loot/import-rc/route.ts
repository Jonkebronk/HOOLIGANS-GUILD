import { NextResponse } from 'next/server';
import { prisma, LootResponse } from '@hooligans/database';
import { requireOfficer, canAccessTeam } from '@/lib/auth-utils';

type ImportResponse = {
  player: string;
  class: string;
  response: string;
  note?: string;
};

type ImportItem = {
  itemName: string;
  wowheadId: number;
  quality: number;
  ilvl: number;
  boss?: string;
  timestamp?: number;
  responses?: ImportResponse[];
};

// Map lowercase response IDs from addon to LootResponse enum
function mapResponseToEnum(response: string): LootResponse | null {
  const responseMap: Record<string, LootResponse> = {
    bis: LootResponse.BiS,
    greater: LootResponse.GreaterUpgrade,
    minor: LootResponse.MinorUpgrade,
    offspec: LootResponse.Offspec,
    pvp: LootResponse.PvP,
    disenchant: LootResponse.Disenchant,
  };
  return responseMap[response.toLowerCase()] || null;
}

export async function POST(request: Request) {
  try {
    // Require officer permission for importing loot
    const { authorized, error } = await requireOfficer();
    if (!authorized) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { teamId, items } = body as { teamId: string; items: ImportItem[] };

    if (!teamId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing teamId or items' },
        { status: 400 }
      );
    }

    // Verify team access
    const hasAccess = await canAccessTeam(teamId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const results = {
      imported: 0,
      assigned: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get all players for this team to match by name
    const teamPlayers = await prisma.player.findMany({
      where: { teamId },
      select: { id: true, name: true },
    });

    // Create a case-insensitive name lookup map
    const playerByName = new Map<string, string>();
    for (const player of teamPlayers) {
      playerByName.set(player.name.toLowerCase(), player.id);
    }

    // Create LootRecords for each imported item
    for (const importItem of items) {
      try {
        // Parse timestamp from Unix seconds to Date
        const lootDate = importItem.timestamp
          ? new Date(importItem.timestamp * 1000)
          : new Date();

        // Try to find the item in our database by wowheadId
        const dbItem = await prisma.item.findFirst({
          where: {
            wowheadId: importItem.wowheadId,
          },
        });

        // Determine if we should auto-assign based on responses
        let assignedPlayerId: string | null = null;
        let assignedResponse: LootResponse | null = null;

        if (importItem.responses && importItem.responses.length === 1) {
          // Single response = winner, auto-assign
          const winnerResponse = importItem.responses[0];
          const playerId = playerByName.get(winnerResponse.player.toLowerCase());
          if (playerId) {
            assignedPlayerId = playerId;
            assignedResponse = mapResponseToEnum(winnerResponse.response);
          }
        }

        // Check for duplicates - same item, same timestamp, same player
        const existing = await prisma.lootRecord.findFirst({
          where: {
            teamId,
            wowheadId: importItem.wowheadId,
            rcTimestamp: lootDate,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create the loot record
        await prisma.lootRecord.create({
          data: {
            teamId,
            itemId: dbItem?.id || null,
            itemName: importItem.itemName,
            wowheadId: importItem.wowheadId,
            quality: importItem.quality,
            playerId: assignedPlayerId,
            response: assignedResponse,
            lootDate,
            rcTimestamp: lootDate,
          },
        });

        results.imported++;
        if (dbItem) {
          results.linked++;
        }
        if (assignedPlayerId) {
          results.assigned++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Failed to import ${importItem.itemName}: ${message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to import RC loot:', error);
    return NextResponse.json(
      { error: 'Failed to import loot' },
      { status: 500 }
    );
  }
}
