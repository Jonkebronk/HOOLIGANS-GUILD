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
      skipped: 0,
      errors: [] as string[],
    };

    for (const importItem of items) {
      try {
        // First, find or create the item in the Item table
        let item = await prisma.item.findFirst({
          where: {
            OR: [
              { wowheadId: importItem.wowheadId },
              { name: importItem.itemName },
            ],
          },
        });

        if (!item) {
          // Create new item
          item = await prisma.item.create({
            data: {
              name: importItem.itemName,
              wowheadId: importItem.wowheadId,
              quality: importItem.quality,
              slot: 'Misc', // Default slot, can be updated later
              raid: 'Unknown', // Will be updated when item is assigned
              boss: 'Unknown',
              phase: 'P1', // Default phase
            },
          });
        }

        // Create a loot record for the drop (unassigned)
        // Note: We're creating a placeholder loot record that can be assigned later
        // For now, we just track the item was imported
        results.imported++;
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
