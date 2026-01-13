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

// PATCH - Link item to tier token piece
export async function PATCH(request: NextRequest) {
  try {
    const { pieceId, wowheadUrl } = await request.json();

    if (!pieceId || !wowheadUrl) {
      return NextResponse.json(
        { error: 'pieceId and wowheadUrl are required' },
        { status: 400 }
      );
    }

    // Parse Wowhead URL
    const wowheadId = parseWowheadUrl(wowheadUrl);
    if (!wowheadId) {
      return NextResponse.json(
        { error: 'Invalid Wowhead URL' },
        { status: 400 }
      );
    }

    // Check if item already exists in database
    let item = await prisma.item.findFirst({
      where: { wowheadId },
    });

    if (!item) {
      // Fetch item details from Wowhead
      const details = await fetchItemDetails(wowheadId);
      if (!details) {
        return NextResponse.json(
          { error: 'Failed to fetch item details from Wowhead' },
          { status: 500 }
        );
      }

      // Create item in database
      item = await prisma.item.create({
        data: {
          name: details.name,
          wowheadId,
          icon: details.icon,
          quality: details.quality,
          slot: 'Misc', // Will be determined by the tier piece slot
          raid: 'Unknown',
          boss: 'Unknown',
          phase: 'P1',
        },
      });
    }

    // Update the tier token piece with the item link
    const updatedPiece = await prisma.tierTokenPiece.update({
      where: { id: pieceId },
      data: { pieceItemId: item.id },
      include: {
        pieceItem: {
          select: {
            id: true,
            name: true,
            wowheadId: true,
            icon: true,
            quality: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPiece);
  } catch (error) {
    console.error('Failed to link item to piece:', error);
    return NextResponse.json(
      { error: 'Failed to link item to piece' },
      { status: 500 }
    );
  }
}

// POST - Bulk import items to tier token pieces
export async function POST(request: NextRequest) {
  try {
    const { tokenId, items } = await request.json();

    if (!tokenId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'tokenId and items array are required' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const { pieceId, wowheadUrl } of items) {
      try {
        const wowheadId = parseWowheadUrl(wowheadUrl);
        if (!wowheadId) {
          results.failed++;
          results.errors.push(`Invalid URL for piece ${pieceId}`);
          continue;
        }

        // Check if item already exists
        let item = await prisma.item.findFirst({
          where: { wowheadId },
        });

        if (!item) {
          // Fetch item details from Wowhead
          const details = await fetchItemDetails(wowheadId);
          if (!details) {
            results.failed++;
            results.errors.push(`Failed to fetch item ${wowheadId}`);
            continue;
          }

          // Create item
          item = await prisma.item.create({
            data: {
              name: details.name,
              wowheadId,
              icon: details.icon,
              quality: details.quality,
              slot: 'Misc',
              raid: 'Unknown',
              boss: 'Unknown',
              phase: 'P1',
            },
          });
        }

        // Link to piece
        await prisma.tierTokenPiece.update({
          where: { id: pieceId },
          data: { pieceItemId: item.id },
        });

        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing piece ${pieceId}: ${error}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to bulk import' },
      { status: 500 }
    );
  }
}
