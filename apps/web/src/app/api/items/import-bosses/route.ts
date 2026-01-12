import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// TMB GitHub raw URLs for TBC item-boss data
const TMB_ITEM_SOURCES_URL = 'https://raw.githubusercontent.com/thatsmybis/burning-crusade-item-db/master/thatsmybis/insert_item_sources.sql';
const TMB_ITEM_ITEM_SOURCES_URL = 'https://raw.githubusercontent.com/thatsmybis/burning-crusade-item-db/master/thatsmybis/insert_item_item_sources.sql';

type ItemSource = {
  id: number;
  name: string;
  instanceName: string;
};

type ItemSourceMapping = {
  itemSourceId: number;
  itemId: number;
};

// Parse the INSERT statements from TMB's SQL files
function parseItemSources(sql: string): ItemSource[] {
  const sources: ItemSource[] = [];

  // Match INSERT statements for item_sources
  // Format: INSERT INTO `item_sources` (`id`, `name`, `slug`, `instance_id`, `npc_id`, `object_id`, `order`, `created_at`, `updated_at`) VALUES
  // (85, 'Attumen the Huntsman', 'attumen-the-huntsman', 9, 15550, NULL, 1, ...),

  const lines = sql.split('\n');
  let currentInstance = '';

  for (const line of lines) {
    // Check for instance comments like "-- Karazhan"
    const instanceMatch = line.match(/^-- (.+)$/);
    if (instanceMatch) {
      currentInstance = instanceMatch[1].trim();
      continue;
    }

    // Match value tuples: (id, 'name', 'slug', instance_id, npc_id, ...)
    const valueMatches = line.matchAll(/\((\d+),\s*'([^']+)',\s*'([^']+)',\s*(\d+)/g);
    for (const match of valueMatches) {
      sources.push({
        id: parseInt(match[1]),
        name: match[2],
        instanceName: currentInstance || 'Unknown',
      });
    }
  }

  return sources;
}

function parseItemItemSources(sql: string): ItemSourceMapping[] {
  const mappings: ItemSourceMapping[] = [];

  // Format: (item_source_id, item_id, 'created_at'),
  const matches = sql.matchAll(/\((\d+),\s*(\d+),/g);
  for (const match of matches) {
    mappings.push({
      itemSourceId: parseInt(match[1]),
      itemId: parseInt(match[2]),
    });
  }

  return mappings;
}

export async function POST() {
  try {
    // Fetch TMB data files
    const [sourcesRes, mappingsRes] = await Promise.all([
      fetch(TMB_ITEM_SOURCES_URL),
      fetch(TMB_ITEM_ITEM_SOURCES_URL),
    ]);

    if (!sourcesRes.ok || !mappingsRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TMB data files' },
        { status: 500 }
      );
    }

    const sourcesSql = await sourcesRes.text();
    const mappingsSql = await mappingsRes.text();

    // Parse the SQL files
    const sources = parseItemSources(sourcesSql);
    const mappings = parseItemItemSources(mappingsSql);

    console.log(`Parsed ${sources.length} item sources and ${mappings.length} item-source mappings`);

    // Create lookup maps
    const sourceById = new Map<number, ItemSource>();
    for (const source of sources) {
      sourceById.set(source.id, source);
    }

    const itemToBoss = new Map<number, string>();
    for (const mapping of mappings) {
      const source = sourceById.get(mapping.itemSourceId);
      if (source && !itemToBoss.has(mapping.itemId)) {
        // Only set if not already set (first source wins)
        itemToBoss.set(mapping.itemId, source.name);
      }
    }

    console.log(`Created lookup for ${itemToBoss.size} items to bosses`);

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

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      updated,
      alreadySet,
      notFound,
      sourcesLoaded: sources.length,
      mappingsLoaded: mappings.length,
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
    // Fetch TMB data files
    const [sourcesRes, mappingsRes] = await Promise.all([
      fetch(TMB_ITEM_SOURCES_URL),
      fetch(TMB_ITEM_ITEM_SOURCES_URL),
    ]);

    if (!sourcesRes.ok || !mappingsRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TMB data files' },
        { status: 500 }
      );
    }

    const sourcesSql = await sourcesRes.text();
    const mappingsSql = await mappingsRes.text();

    const sources = parseItemSources(sourcesSql);
    const mappings = parseItemItemSources(mappingsSql);

    // Create lookup
    const sourceById = new Map<number, ItemSource>();
    for (const source of sources) {
      sourceById.set(source.id, source);
    }

    const itemToBoss = new Map<number, string>();
    for (const mapping of mappings) {
      const source = sourceById.get(mapping.itemSourceId);
      if (source && !itemToBoss.has(mapping.itemId)) {
        itemToBoss.set(mapping.itemId, source.name);
      }
    }

    // Get items that would be updated
    const items = await prisma.item.findMany({
      where: {
        wowheadId: { not: null },
        OR: [
          { boss: null },
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
      sourcesLoaded: sources.length,
      mappingsLoaded: mappings.length,
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
