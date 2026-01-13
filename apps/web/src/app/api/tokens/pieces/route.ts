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

// POST - Add new piece(s) to a token for a class
export async function POST(request: NextRequest) {
  try {
    const { tokenId, className, wowheadUrls } = await request.json();

    if (!tokenId || !className || !wowheadUrls || !Array.isArray(wowheadUrls)) {
      return NextResponse.json(
        { error: 'tokenId, className, and wowheadUrls array are required' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const wowheadUrl of wowheadUrls) {
      if (!wowheadUrl.trim()) continue;

      try {
        const wowheadId = parseWowheadUrl(wowheadUrl);
        if (!wowheadId) {
          results.failed++;
          results.errors.push(`Invalid URL: ${wowheadUrl}`);
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

        // Check if this exact piece already exists for this token/class/item
        const existingPiece = await prisma.tierTokenPiece.findFirst({
          where: {
            tokenId,
            className,
            pieceItemId: item.id,
          },
        });

        if (existingPiece) {
          results.failed++;
          results.errors.push(`${item.name} already linked to ${className}`);
          continue;
        }

        // Create new piece
        await prisma.tierTokenPiece.create({
          data: {
            tokenId,
            className,
            pieceName: item.name,
            pieceItemId: item.id,
          },
        });

        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error: ${error}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to add pieces:', error);
    return NextResponse.json(
      { error: 'Failed to add pieces' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a piece
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pieceId = searchParams.get('pieceId');

    if (!pieceId) {
      return NextResponse.json(
        { error: 'pieceId is required' },
        { status: 400 }
      );
    }

    await prisma.tierTokenPiece.delete({
      where: { id: pieceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete piece:', error);
    return NextResponse.json(
      { error: 'Failed to delete piece' },
      { status: 500 }
    );
  }
}
