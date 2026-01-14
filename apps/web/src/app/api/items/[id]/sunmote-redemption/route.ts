import { NextRequest, NextResponse } from 'next/server';
import { prisma, GearSlot } from '@hooligans/database';

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
  'Two-Hand': 'MainHand',
  'One-Hand': 'OneHand',
  'Off Hand': 'OffHand',
  'Shield': 'OffHand',
  'Held In Off-hand': 'OffHand',
  'Ranged': 'Ranged',
  'Relic': 'Ranged',
  'Idol': 'Ranged',
  'Libram': 'Ranged',
  'Totem': 'Ranged',
  'Wand': 'Ranged',
  'Gun': 'Ranged',
  'Bow': 'Ranged',
  'Crossbow': 'Ranged',
  'Thrown': 'Ranged',
};

// Parse item ID from Wowhead URL
function parseWowheadUrl(url: string): number | null {
  const match = url.match(/item[=\/](\d+)/i);
  if (match) {
    return parseInt(match[1]);
  }
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
    const tooltipUrl = `https://nether.wowhead.com/tooltip/item/${itemId}?dataEnv=5&locale=0`;
    const response = await fetch(tooltipUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

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

// GET - Get sunmote redemption for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const redemption = await prisma.sunmoteRedemption.findUnique({
      where: { baseItemId: id },
      include: {
        upgradedItem: {
          include: {
            lootRecords: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    class: true,
                  },
                },
              },
              orderBy: { lootDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    return NextResponse.json(redemption);
  } catch (error) {
    console.error('Failed to fetch sunmote redemption:', error);
    return NextResponse.json({ error: 'Failed to fetch sunmote redemption' }, { status: 500 });
  }
}

// POST - Add a sunmote upgrade to an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { wowheadUrl } = body;

    if (!wowheadUrl) {
      return NextResponse.json(
        { error: 'wowheadUrl is required' },
        { status: 400 }
      );
    }

    // Check if base item exists
    const baseItem = await prisma.item.findUnique({ where: { id } });
    if (!baseItem) {
      return NextResponse.json({ error: 'Base item not found' }, { status: 404 });
    }

    // Check if base item already has a sunmote redemption
    const existingRedemption = await prisma.sunmoteRedemption.findUnique({
      where: { baseItemId: id },
    });
    if (existingRedemption) {
      return NextResponse.json(
        { error: 'This item already has a sunmote upgrade linked' },
        { status: 400 }
      );
    }

    // Parse Wowhead URL
    const wowheadId = parseWowheadUrl(wowheadUrl);
    if (!wowheadId) {
      return NextResponse.json(
        { error: 'Could not parse item ID from URL' },
        { status: 400 }
      );
    }

    // Check if upgraded item already exists in database
    let upgradedItem = await prisma.item.findUnique({ where: { wowheadId } });

    if (!upgradedItem) {
      // Fetch item details from Wowhead
      const details = await fetchItemDetails(wowheadId);
      if (!details) {
        return NextResponse.json(
          { error: 'Failed to fetch item details from Wowhead' },
          { status: 400 }
        );
      }

      // Create the upgraded item
      upgradedItem = await prisma.item.create({
        data: {
          name: details.name,
          wowheadId: details.wowheadId,
          icon: details.icon,
          quality: 5, // Legendary quality for sunmote upgraded items
          slot: details.slot,
          raid: 'Sunwell Plateau',
          boss: 'Sunmote Vendor',
          phase: 'P5',
        },
      });
    }

    // Create the sunmote redemption link
    const redemption = await prisma.sunmoteRedemption.create({
      data: {
        baseItemId: id,
        upgradedItemId: upgradedItem.id,
        sunmotesRequired: 1,
      },
      include: {
        upgradedItem: {
          include: {
            lootRecords: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    class: true,
                  },
                },
              },
              orderBy: { lootDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    return NextResponse.json(redemption);
  } catch (error) {
    console.error('Failed to create sunmote redemption:', error);
    return NextResponse.json({ error: 'Failed to create sunmote redemption' }, { status: 500 });
  }
}

// DELETE - Remove sunmote redemption from an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find and delete the redemption
    const redemption = await prisma.sunmoteRedemption.findUnique({
      where: { baseItemId: id },
    });

    if (!redemption) {
      return NextResponse.json({ error: 'No sunmote redemption found for this item' }, { status: 404 });
    }

    await prisma.sunmoteRedemption.delete({
      where: { id: redemption.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sunmote redemption:', error);
    return NextResponse.json({ error: 'Failed to delete sunmote redemption' }, { status: 500 });
  }
}
