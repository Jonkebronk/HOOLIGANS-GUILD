import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// Map Wowhead inventory types to our slot names
const INVENTORY_TYPE_MAP: Record<number, string> = {
  1: 'Head',
  2: 'Neck',
  3: 'Shoulder',
  4: 'Shirt',
  5: 'Chest',
  6: 'Waist',
  7: 'Legs',
  8: 'Feet',
  9: 'Wrist',
  10: 'Hands',
  11: 'Finger',
  12: 'Trinket',
  13: 'One-Hand',
  14: 'Off Hand',
  15: 'Ranged',
  16: 'Back',
  17: 'Two-Hand',
  18: 'Bag',
  19: 'Tabard',
  20: 'Chest', // Robe
  21: 'Main Hand',
  22: 'Off Hand',
  23: 'Held In Off-hand',
  24: 'Ammo',
  25: 'Thrown',
  26: 'Ranged',
  28: 'Relic',
};

// Extract item IDs from Wowhead zone page HTML
function extractItemIds(html: string): number[] {
  const itemIds: Set<number> = new Set();

  // Strategy 1: Look for drops listview data
  const dropsMatch = html.match(/id:\s*['"]?drops['"]?[^}]*data:\s*\[([^\]]+)\]/s);
  if (dropsMatch) {
    const idsInData = dropsMatch[1].match(/\b(\d{4,5})\b/g);
    if (idsInData) {
      idsInData.forEach(id => {
        const numId = parseInt(id);
        if (numId >= 1000 && numId <= 99999) {
          itemIds.add(numId);
        }
      });
    }
  }

  // Strategy 2: Look for WH.Gatherer.addData calls with type 3 (items)
  const gathererMatches = html.matchAll(/WH\.Gatherer\.addData\s*\(\s*3\s*,\s*\{([^}]+)\}/g);
  for (const match of gathererMatches) {
    const idsInData = match[1].match(/"(\d+)":/g);
    if (idsInData) {
      idsInData.forEach(idMatch => {
        const id = parseInt(idMatch.replace(/["":]/g, ''));
        if (id >= 1000 && id <= 99999) {
          itemIds.add(id);
        }
      });
    }
  }

  // Strategy 3: Look for listview with template:'item'
  const listviewMatch = html.match(/template:\s*['"]item['"][^}]*data:\s*\[([^\]]+)\]/s);
  if (listviewMatch) {
    const idsInData = listviewMatch[1].match(/"id"\s*:\s*(\d+)/g);
    if (idsInData) {
      idsInData.forEach(idMatch => {
        const id = parseInt(idMatch.replace(/[^0-9]/g, ''));
        if (id >= 1000 && id <= 99999) {
          itemIds.add(id);
        }
      });
    }
  }

  // Strategy 4: Extract from any item links in page
  const itemLinkMatches = html.matchAll(/\/item[=/](\d+)/g);
  for (const match of itemLinkMatches) {
    const id = parseInt(match[1]);
    if (id >= 1000 && id <= 99999) {
      itemIds.add(id);
    }
  }

  return Array.from(itemIds);
}

// Fetch item details from Wowhead tooltip API
async function fetchItemDetails(itemId: number): Promise<{
  name: string;
  icon: string;
  quality: number;
  slot: string | null;
} | null> {
  try {
    // Use Wowhead's tooltip API (dataEnv=5 is TBC)
    const tooltipUrl = `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=5&locale=0`;
    const response = await fetch(tooltipUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Extract slot from tooltip HTML if available
    let slot: string | null = null;
    if (data.tooltip) {
      // Look for inventory slot in tooltip HTML comments or text
      const slotMatch = data.tooltip.match(/<!--\s*inventorySlot:\s*(\d+)\s*-->/);
      if (slotMatch) {
        slot = INVENTORY_TYPE_MAP[parseInt(slotMatch[1])] || null;
      }
      // Alternative: Look for slot text like "Head", "Chest", etc.
      if (!slot) {
        const slotTextMatch = data.tooltip.match(/<th[^>]*>(Head|Neck|Shoulder|Back|Chest|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Relic)<\/th>/i);
        if (slotTextMatch) {
          slot = slotTextMatch[1];
        }
      }
    }

    return {
      name: data.name || `Item ${itemId}`,
      icon: data.icon || 'inv_misc_questionmark',
      quality: data.quality ?? 4,
      slot,
    };
  } catch (error) {
    console.error(`Failed to fetch item ${itemId}:`, error);
    return null;
  }
}

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const { zoneId, raidName, phase } = await request.json();

    if (!zoneId || !raidName || !phase) {
      return NextResponse.json(
        { error: 'Missing required fields: zoneId, raidName, phase' },
        { status: 400 }
      );
    }

    // Fetch Wowhead zone page
    const zoneUrl = `https://www.wowhead.com/tbc/zone=${zoneId}#drops`;
    console.log(`Fetching zone: ${zoneUrl}`);

    const response = await fetch(zoneUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Wowhead zone page: ${response.status}` },
        { status: 500 }
      );
    }

    const html = await response.text();

    // Extract item IDs from the page
    const itemIds = extractItemIds(html);
    console.log(`Found ${itemIds.length} item IDs in zone ${zoneId}`);

    if (itemIds.length === 0) {
      return NextResponse.json(
        { error: 'No items found on the zone page. The page structure may have changed.' },
        { status: 404 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each item
    for (const itemId of itemIds) {
      try {
        // Check if item already exists
        const existing = await prisma.item.findFirst({
          where: { wowheadId: itemId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Fetch item details from Wowhead tooltip API
        const details = await fetchItemDetails(itemId);

        if (details) {
          // Create item in database
          await prisma.item.create({
            data: {
              name: details.name,
              wowheadId: itemId,
              icon: details.icon,
              quality: details.quality,
              slot: details.slot || 'Unknown',
              raid: raidName,
              phase: phase,
            },
          });
          imported++;
        } else {
          errors.push(`Failed to fetch details for item ${itemId}`);
        }

        // Rate limiting - 50ms between requests
        await delay(50);
      } catch (error) {
        if (errors.length < 10) {
          errors.push(`Error processing item ${itemId}: ${error}`);
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: itemIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} items from ${raidName}. ${skipped} items were already in the database.`,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import items: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
