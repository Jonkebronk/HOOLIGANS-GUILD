import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const slot = searchParams.get('slot');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    // Filter by name if query provided (prioritize search over slot)
    if (query) {
      where.name = {
        contains: query,
        mode: 'insensitive',
      };
    }

    // First try with slot filter
    if (slot && !query) {
      // Handle slots that can be either position (Finger1/Finger2, etc.)
      if (slot === 'Finger1' || slot === 'Finger2') {
        where.slot = { in: ['Finger1', 'Finger2'] };
      } else if (slot === 'Trinket1' || slot === 'Trinket2') {
        where.slot = { in: ['Trinket1', 'Trinket2'] };
      } else if (slot === 'Weapon1' || slot === 'Weapon2') {
        where.slot = { in: ['Weapon1', 'Weapon2'] };
      } else {
        where.slot = slot;
      }
    }

    let items = await prisma.item.findMany({
      where,
      orderBy: [
        { quality: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
    });

    // If no results with slot filter and no search query, show all items
    if (items.length === 0 && slot && !query) {
      items = await prisma.item.findMany({
        orderBy: [
          { quality: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Item search error:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}
