import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// Fetch item details from Wowhead tooltip API
async function fetchItemDetails(itemId: number): Promise<{
  name: string;
  icon: string;
  quality: number;
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

    return {
      name: data.name || `Item ${itemId}`,
      icon: data.icon || 'inv_misc_questionmark',
      quality: data.quality ?? 4,
    };
  } catch (error) {
    console.error(`Failed to fetch item ${itemId}:`, error);
    return null;
  }
}

// Parse Wowhead URL to extract item ID
function parseWowheadUrl(url: string): number | null {
  const match = url.match(/item=(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// GET - List all Sunmote upgrades
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slot = searchParams.get('slot');
    const armorType = searchParams.get('armorType');

    const upgrades = await prisma.sunmoteUpgrade.findMany({
      where: {
        ...(slot && { slot }),
        ...(armorType && { armorType }),
      },
      orderBy: [
        { armorType: 'asc' },
        { slot: 'asc' },
        { baseItemName: 'asc' },
      ],
    });

    return NextResponse.json(upgrades);
  } catch (error) {
    console.error('Failed to fetch Sunmote upgrades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Sunmote upgrades' },
      { status: 500 }
    );
  }
}

// PATCH - Update base or upgraded item from Wowhead URL
export async function PATCH(request: NextRequest) {
  try {
    const { upgradeId, type, wowheadUrl } = await request.json();

    if (!upgradeId || !type || !wowheadUrl) {
      return NextResponse.json(
        { error: 'upgradeId, type (base or upgraded), and wowheadUrl are required' },
        { status: 400 }
      );
    }

    if (type !== 'base' && type !== 'upgraded') {
      return NextResponse.json(
        { error: 'type must be either "base" or "upgraded"' },
        { status: 400 }
      );
    }

    // Parse Wowhead URL to get item ID
    const wowheadId = parseWowheadUrl(wowheadUrl);
    if (!wowheadId) {
      return NextResponse.json(
        { error: 'Invalid Wowhead URL. Expected format: https://www.wowhead.com/tbc/item=XXXXX' },
        { status: 400 }
      );
    }

    // Fetch item details from Wowhead
    const details = await fetchItemDetails(wowheadId);
    if (!details) {
      return NextResponse.json(
        { error: `Failed to fetch item details for ID ${wowheadId}` },
        { status: 400 }
      );
    }

    // Update the sunmote upgrade with the new item details
    const updateData = type === 'base'
      ? {
          baseItemName: details.name,
          baseWowheadId: wowheadId,
          baseIcon: details.icon,
        }
      : {
          upgradedName: details.name,
          upgradedWowheadId: wowheadId,
          upgradedIcon: details.icon,
        };

    const updated = await prisma.sunmoteUpgrade.update({
      where: { id: upgradeId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update Sunmote upgrade:', error);
    return NextResponse.json(
      { error: 'Failed to update Sunmote upgrade' },
      { status: 500 }
    );
  }
}
