import { NextResponse } from 'next/server';
import { GearSlot } from '@hooligans/database';

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

// Parse item ID from Wowhead URL
function parseWowheadUrl(url: string): number | null {
  const match = url.match(/item[=\/](\d+)/i);
  if (match) {
    return parseInt(match[1]);
  }
  // Also try just a plain number
  const numMatch = url.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  return null;
}

// Fetch item details from Wowhead tooltip API
async function fetchItemDetails(itemId: number): Promise<{
  wowheadId: number;
  name: string;
  icon: string;
  quality: number;
  slot: GearSlot;
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
    let slot: GearSlot = 'Misc';
    if (data.tooltip) {
      const slotMatch = data.tooltip.match(/<td>(Head|Neck|Shoulder|Back|Chest|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|One-Hand|Two-Hand|Main Hand|Off Hand|Ranged|Relic|Thrown|Wand|Shield|Held In Off-hand|Idol|Libram|Totem|Gun|Bow|Crossbow)<\/td>/i);
      if (slotMatch) {
        slot = SLOT_TEXT_MAP[slotMatch[1]] || 'Misc';
      }
    }

    return {
      wowheadId: itemId,
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
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty urls array' },
        { status: 400 }
      );
    }

    const items: {
      wowheadId: number;
      name: string;
      icon: string;
      quality: number;
      slot: GearSlot;
      url: string;
    }[] = [];
    const errors: { url: string; error: string }[] = [];

    // Process each URL
    for (const url of urls) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) continue;

      const itemId = parseWowheadUrl(trimmedUrl);

      if (!itemId) {
        errors.push({ url: trimmedUrl, error: 'Could not parse item ID from URL' });
        continue;
      }

      // Fetch item details from Wowhead
      const details = await fetchItemDetails(itemId);

      if (details) {
        items.push({
          ...details,
          url: trimmedUrl,
        });
      } else {
        errors.push({ url: trimmedUrl, error: `Failed to fetch item ${itemId} from Wowhead` });
      }

      // Rate limiting - 50ms between requests
      await delay(50);
    }

    return NextResponse.json({
      items,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Import Wowhead URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
