import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// TMB GitHub raw URL for TBC loot tables (Lua format with boss->item mappings)
const TMB_LOOT_TABLES_URL = 'https://raw.githubusercontent.com/thatsmybis/burning-crusade-item-db/main/thatsmybis/lootTables.txt';

type BossItemMapping = {
  bossName: string;
  itemId: number;
};

// Parse the lootTables.txt Lua format
// Format:
// zone_id, "Zone Name"
//     boss_id, "Boss Name"
//         item_id, -- item-slug
function parseLootTables(luaData: string): BossItemMapping[] {
  const mappings: BossItemMapping[] = [];
  const lines = luaData.split('\n');

  let currentBoss = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for boss line: boss_id, "Boss Name" or null, "Trash"
    // Pattern: either number or null, then comma, then quoted string
    const bossMatch = trimmed.match(/^(?:null|\d+),\s*"([^"]+)"/);
    if (bossMatch) {
      currentBoss = bossMatch[1];
      continue;
    }

    // Check for item line: item_id, -- item-slug
    // Pattern: just a number at the start, followed by comma
    const itemMatch = trimmed.match(/^(\d+),/);
    if (itemMatch && currentBoss) {
      mappings.push({
        bossName: currentBoss,
        itemId: parseInt(itemMatch[1]),
      });
    }
  }

  return mappings;
}

export async function POST() {
  try {
    // Fetch TMB loot tables
    const response = await fetch(TMB_LOOT_TABLES_URL);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TMB loot tables' },
        { status: 500 }
      );
    }

    const luaData = await response.text();

    // Parse the Lua file
    const mappings = parseLootTables(luaData);

    console.log(`Parsed ${mappings.length} boss-item mappings from lootTables.txt`);

    // Create lookup map: itemId -> bossName
    const itemToBoss = new Map<number, string>();
    for (const mapping of mappings) {
      if (!itemToBoss.has(mapping.itemId)) {
        // Only set if not already set (first boss wins)
        itemToBoss.set(mapping.itemId, mapping.bossName);
      }
    }

    console.log(`Created lookup for ${itemToBoss.size} unique items to bosses`);

    // Get all items from our database
    const items = await prisma.item.findMany({
      where: {
        wowheadId: { not: null },
      },
      select: {
        id: true,
        wowheadId: true,
        boss: true,
      },
    });

    // Update items with boss names
    let updated = 0;
    let alreadySet = 0;
    let notFound = 0;

    for (const item of items) {
      if (!item.wowheadId) continue;

      const bossName = itemToBoss.get(item.wowheadId);

      if (bossName) {
        if (item.boss && item.boss !== 'Unknown') {
          alreadySet++;
          continue; // Don't overwrite existing boss data
        }

        await prisma.item.update({
          where: { id: item.id },
          data: { boss: bossName },
        });
        updated++;
      } else {
        notFound++;
      }
    }

    // Get sample item IDs from our DB for debugging
    const sampleDbItems = items.slice(0, 5).map(i => i.wowheadId);
    // Get sample item IDs from TMB for debugging
    const sampleTmbItems = Array.from(itemToBoss.keys()).slice(0, 5);

    // Find any overlapping IDs between DB and TMB
    const dbIdSet = new Set(items.map(i => i.wowheadId).filter(Boolean));
    const tmbIdSet = new Set(itemToBoss.keys());
    const matchingIds = [...dbIdSet].filter(id => tmbIdSet.has(id as number)).slice(0, 10);

    // Get unique bosses found
    const uniqueBosses = [...new Set(mappings.map(m => m.bossName))].slice(0, 10);

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      updated,
      alreadySet,
      notFound,
      mappingsLoaded: mappings.length,
      itemToBossSize: itemToBoss.size,
      debug: {
        sampleDbItems,
        sampleTmbItems,
        matchingIds,
        uniqueBosses,
        rawSample: luaData.substring(0, 500),
      }
    });
  } catch (error) {
    console.error('Failed to import boss data:', error);
    return NextResponse.json(
      { error: 'Failed to import boss data', details: String(error) },
      { status: 500 }
    );
  }
}

// GET to preview what would be updated
export async function GET() {
  try {
    // Fetch TMB loot tables
    const response = await fetch(TMB_LOOT_TABLES_URL);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TMB loot tables' },
        { status: 500 }
      );
    }

    const luaData = await response.text();
    const mappings = parseLootTables(luaData);

    // Create lookup map
    const itemToBoss = new Map<number, string>();
    for (const mapping of mappings) {
      if (!itemToBoss.has(mapping.itemId)) {
        itemToBoss.set(mapping.itemId, mapping.bossName);
      }
    }

    // Get items that would be updated (boss is empty or 'Unknown')
    const items = await prisma.item.findMany({
      where: {
        wowheadId: { not: null },
        OR: [
          { boss: '' },
          { boss: 'Unknown' },
        ],
      },
      select: {
        id: true,
        name: true,
        wowheadId: true,
        raid: true,
        boss: true,
      },
      take: 50, // Preview first 50
    });

    const preview = items.map(item => ({
      name: item.name,
      wowheadId: item.wowheadId,
      raid: item.raid,
      currentBoss: item.boss,
      newBoss: item.wowheadId ? itemToBoss.get(item.wowheadId) || 'Not found in TMB' : 'No wowhead ID',
    }));

    return NextResponse.json({
      mappingsLoaded: mappings.length,
      itemToBossSize: itemToBoss.size,
      itemsToUpdate: items.length,
      preview,
    });
  } catch (error) {
    console.error('Failed to preview boss data:', error);
    return NextResponse.json(
      { error: 'Failed to preview boss data', details: String(error) },
      { status: 500 }
    );
  }
}
