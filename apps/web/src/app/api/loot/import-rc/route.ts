import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

type ImportItem = {
  itemName: string;
  wowheadId: number;
  quality: number;
  ilvl: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamId, items } = body as { teamId: string; items: ImportItem[] };

    if (!teamId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing teamId or items' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Create LootRecords for each imported item (unassigned drops)
    for (const importItem of items) {
      try {
        // Check if this item was already imported (same wowheadId and team, unassigned)
        const existing = await prisma.lootRecord.findFirst({
          where: {
            teamId,
            wowheadId: importItem.wowheadId,
            playerId: null, // Only skip if unassigned duplicate
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Try to find the item in our database by wowheadId
        const dbItem = await prisma.item.findFirst({
          where: {
            wowheadId: importItem.wowheadId,
          },
        });

        // Create the loot record, linking to database item if found
        await prisma.lootRecord.create({
          data: {
            teamId,
            itemId: dbItem?.id || null, // Link to Item if found
            itemName: importItem.itemName,
            wowheadId: importItem.wowheadId,
            quality: importItem.quality,
            // No playerId = unassigned
            // No response = pending
          },
        });

        results.imported++;
        if (dbItem) {
          results.linked++;
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
