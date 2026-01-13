import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function POST(request: Request) {
  try {
    const { itemId, wowheadId } = await request.json();

    if (!itemId || !wowheadId) {
      return NextResponse.json({ error: 'itemId and wowheadId are required' }, { status: 400 });
    }

    // Fetch icon from Wowhead tooltip API
    const tooltipUrl = `https://nether.wowhead.com/tooltip/item/${wowheadId}?dataEnv=5&locale=0`;
    const response = await fetch(tooltipUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Wowhead' }, { status: 500 });
    }

    const data = await response.json();

    if (!data.icon) {
      return NextResponse.json({ error: 'No icon found in Wowhead response' }, { status: 404 });
    }

    // Update the item in the database
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        icon: data.icon,
        // Also update name and quality if they changed
        ...(data.name && { name: data.name }),
        ...(data.quality !== undefined && { quality: data.quality }),
      },
    });

    return NextResponse.json({
      success: true,
      icon: data.icon,
      name: data.name,
      quality: data.quality,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Failed to refresh icon:', error);
    return NextResponse.json({ error: 'Failed to refresh icon' }, { status: 500 });
  }
}
