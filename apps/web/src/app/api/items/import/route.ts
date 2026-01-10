import { NextResponse } from 'next/server';
import { prisma, GearSlot } from '@hooligans/database';

// Map Wowhead inventory types to GearSlot enum (not currently used, using text extraction instead)
const INVENTORY_TYPE_MAP: Record<number, GearSlot> = {
  1: 'Head',
  2: 'Neck',
  3: 'Shoulder',
  5: 'Chest',
  6: 'Waist',
  7: 'Legs',
  8: 'Feet',
  9: 'Wrist',
  10: 'Hands',
  11: 'Finger',
  12: 'Trinket',
  13: 'OneHand',
  14: 'OffHand',
  15: 'Ranged',
  16: 'Back',
  17: 'TwoHand',
  20: 'Chest',       // Robe
  21: 'MainHand',
  22: 'OffHand',
  23: 'HeldInOffhand',
  25: 'Thrown',
  26: 'Ranged',
  28: 'Relic',
};

// Map slot text to GearSlot enum
const SLOT_TEXT_MAP: Record<string, GearSlot> = {
  'Head': 'Head',
  'Neck': 'Neck',
  'Shoulder': 'Shoulder',
  'Back': 'Back',
  'Chest': 'Chest',
  'Wrist': 'Wrist',
  'Hands': 'Hands',
  'Waist': 'Waist',
  'Legs': 'Legs',
  'Feet': 'Feet',
  'Finger': 'Finger',
  'Trinket': 'Trinket',
  'Main Hand': 'MainHand',
  'Off Hand': 'OffHand',
  'One-Hand': 'OneHand',
  'Two-Hand': 'TwoHand',
  'Ranged': 'Ranged',
  'Relic': 'Relic',
  'Idol': 'Relic',
  'Libram': 'Relic',
  'Totem': 'Relic',
  'Wand': 'Wand',
  'Gun': 'Ranged',
  'Bow': 'Ranged',
  'Crossbow': 'Ranged',
  'Thrown': 'Thrown',
  'Shield': 'Shield',
  'Held In Off-hand': 'HeldInOffhand',
};

// Extract item IDs from Wowhead zone page HTML using bracket counting (like GDKP module)
function extractItemIds(html: string): number[] {
  const itemIds: Set<number> = new Set();

  // Strategy 1: Find the drops listview and use bracket counting to get full data array
  const dropsListviewMatch = html.match(/new Listview\(\{[^{]*id:\s*['"]drops['"][^{]*data:\s*\[/);

  if (dropsListviewMatch && dropsListviewMatch.index !== undefined) {
    // Find where the data array starts
    const startIndex = dropsListviewMatch.index + dropsListviewMatch[0].length;

    // Use bracket counting to find the end of the data array
    let bracketCount = 1;
    let endIndex = startIndex;
    for (let i = startIndex; i < html.length && bracketCount > 0; i++) {
      if (html[i] === '[') bracketCount++;
      if (html[i] === ']') bracketCount--;
      endIndex = i;
    }

    const dropsData = html.substring(startIndex, endIndex);

    // Extract all item IDs from the drops data
    const idMatches = dropsData.matchAll(/"id"\s*:\s*(\d+)/g);
    for (const m of idMatches) {
      const id = parseInt(m[1]);
      if (id > 0) {
        itemIds.add(id);
      }
    }
  }

  // Strategy 2: Fallback - Try WH.Gatherer.addData for item type (3)
  if (itemIds.size === 0) {
    const gathererMatches = html.matchAll(/WH\.Gatherer\.addData\(\s*3\s*,\s*\d+\s*,\s*(\{[^}]+\})\)/g);
    for (const m of gathererMatches) {
      const dataStr = m[1];
      const idMatches = dataStr.matchAll(/"(\d+)":/g);
      for (const idm of idMatches) {
        const id = parseInt(idm[1]);
        if (id > 1000 && id < 100000) {
          itemIds.add(id);
        }
      }
    }
  }

  // Strategy 3: Second fallback - Find listviews with template:'item'
  if (itemIds.size === 0) {
    const listviewMatches = html.matchAll(/new Listview\(\{[^}]*template:\s*['"]item['"][^}]*\}/g);
    for (const lvm of listviewMatches) {
      if (lvm.index !== undefined) {
        const startPos = html.indexOf('data:', lvm.index);
        if (startPos > 0 && startPos < lvm.index + 500) {
          // Search in the next 50000 characters (data arrays can be large)
          const searchSection = html.substring(startPos, startPos + 50000);
          const itemMatches = searchSection.matchAll(/"id"\s*:\s*(\d+)/g);
          for (const m of itemMatches) {
            const id = parseInt(m[1]);
            if (id > 1000 && id < 100000) {
              itemIds.add(id);
            }
          }
          break; // Just use the first item listview
        }
      }
    }
  }

  return Array.from(itemIds);
}

// Fetch item details from Wowhead tooltip API
async function fetchItemDetails(itemId: number): Promise<{
  name: string;
  icon: string;
  quality: number;
  slot: GearSlot | null;
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

    // Extract slot from tooltip HTML - look for <td>SlotName</td> pattern
    let slot: GearSlot | null = null;
    if (data.tooltip) {
      // Wowhead puts slot in <td>Legs</td> or <td>Two-Hand</td> format
      const slotMatch = data.tooltip.match(/<td>(Head|Neck|Shoulder|Back|Chest|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|One-Hand|Two-Hand|Main Hand|Off Hand|Ranged|Relic|Thrown|Wand|Shield|Held In Off-hand|Idol|Libram|Totem|Gun|Bow|Crossbow)<\/td>/i);
      if (slotMatch) {
        slot = SLOT_TEXT_MAP[slotMatch[1]] || null;
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
    let alreadyExists = 0;
    let fetchFailed = 0;
    const errors: string[] = [];

    // Process each item
    for (const itemId of itemIds) {
      try {
        // Check if item already exists
        const existing = await prisma.item.findFirst({
          where: { wowheadId: itemId },
        });

        if (existing) {
          alreadyExists++;
          continue;
        }

        // Fetch item details from Wowhead tooltip API
        const details = await fetchItemDetails(itemId);

        if (details) {
          // Use upsert to handle duplicates - unique constraint is on (name, raid)
          await prisma.item.upsert({
            where: {
              name_raid: {
                name: details.name,
                raid: raidName,
              },
            },
            update: {
              wowheadId: itemId,
              icon: details.icon,
              quality: details.quality,
              slot: details.slot || 'Misc',
              phase: phase,
            },
            create: {
              name: details.name,
              wowheadId: itemId,
              icon: details.icon,
              quality: details.quality,
              slot: details.slot || 'Misc',
              raid: raidName,
              boss: 'Unknown',
              phase: phase,
            },
          });
          imported++;
        } else {
          fetchFailed++;
          if (errors.length < 10) {
            errors.push(`Failed to fetch details for item ${itemId}`);
          }
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
      alreadyExists,
      fetchFailed,
      total: itemIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${imported} items from ${raidName}. ${alreadyExists} already in database, ${fetchFailed} failed to fetch.`,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import items: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
