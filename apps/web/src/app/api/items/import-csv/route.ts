import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { requireOfficer } from '@/lib/auth-utils';

// Map CSV slot names to database GearSlot enum values
const slotMapping: Record<string, string> = {
  'head': 'Head',
  'neck': 'Neck',
  'shoulder': 'Shoulder',
  'shoulders': 'Shoulder',
  'back': 'Back',
  'chest': 'Chest',
  'wrist': 'Wrist',
  'wrists': 'Wrist',
  'hands': 'Hands',
  'waist': 'Waist',
  'legs': 'Legs',
  'feet': 'Feet',
  'finger': 'Finger1',
  'ring': 'Finger1',
  'trinket': 'Trinket1',
  'weapon': 'MainHand',
  'mainhand': 'MainHand',
  'main hand': 'MainHand',
  'offhand': 'OffHand',
  'off-hand': 'OffHand',
  'off hand': 'OffHand',
  'ranged': 'Ranged',
  'relic': 'Relic',
  'wand': 'Wand',
  'thrown': 'Thrown',
  'set piece': 'Chest', // Default set pieces to chest
};

// Map phase strings to enum values
const phaseMapping: Record<string, string> = {
  'p1': 'P1',
  'p2': 'P2',
  'p3': 'P3',
  'p4': 'P4',
  'p5': 'P5',
  '1': 'P1',
  '2': 'P2',
  '3': 'P3',
  '4': 'P4',
  '5': 'P5',
};

export async function POST(request: Request) {
  // Require officer permission
  const { authorized, error } = await requireOfficer();
  if (!authorized) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    // Parse CSV - handle both \r\n and \n line endings
    const lines = csvData.trim().split(/\r?\n/);

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    // Parse header to find column indices
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Find column indices - flexible matching
    const nameIdx = header.findIndex(h => h.includes('name') || h === 'item');
    const slotIdx = header.findIndex(h => h === 'slot' || h.includes('slot'));
    const raidIdx = header.findIndex(h => h.includes('location') || h.includes('raid') || h === 'instance');
    const bossIdx = header.findIndex(h => h.includes('boss') || h.includes('source'));
    const phaseIdx = header.findIndex(h => h.includes('phase'));

    if (nameIdx === -1) {
      return NextResponse.json({ error: 'CSV must have an "Item Name" or "Name" column' }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      importedIds: [] as string[],
      skippedIds: [] as string[],
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle commas in quoted strings)
      const values = parseCSVLine(line);

      const name = values[nameIdx]?.trim();
      if (!name) {
        results.errors.push(`Row ${i + 1}: Missing item name`);
        continue;
      }

      // Get slot - map to valid enum value
      let slot = 'MainHand'; // default
      if (slotIdx !== -1 && values[slotIdx]) {
        const slotValue = values[slotIdx].trim().toLowerCase();
        slot = slotMapping[slotValue] || 'MainHand';
      }

      // Get raid/location
      const raid = raidIdx !== -1 && values[raidIdx] ? values[raidIdx].trim() : 'Unknown';

      // Get boss
      const boss = bossIdx !== -1 && values[bossIdx] ? values[bossIdx].trim() : 'Unknown';

      // Get phase
      let phase = 'P1'; // default
      if (phaseIdx !== -1 && values[phaseIdx]) {
        const phaseValue = values[phaseIdx].trim().toLowerCase();
        phase = phaseMapping[phaseValue] || 'P1';
      }

      try {
        // Check if item already exists
        const existing = await prisma.item.findFirst({
          where: { name, raid },
        });

        if (existing) {
          results.skipped++;
          results.skippedIds.push(existing.id);
          continue;
        }

        // Create the item
        const newItem = await prisma.item.create({
          data: {
            name,
            slot: slot as any,
            raid,
            boss,
            phase: phase as any,
            quality: 4, // Default to epic
          },
        });

        results.imported++;
        results.importedIds.push(newItem.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Row ${i + 1} (${name}): ${errorMsg}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('CSV import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to import CSV: ${errorMessage}` }, { status: 500 });
  }
}

// Parse a CSV line, handling quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
