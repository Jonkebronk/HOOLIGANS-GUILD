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
      // Handle grouped slots - rings, trinkets, and weapons
      if (slot === 'Finger1' || slot === 'Finger2' || slot === 'Finger') {
        where.slot = 'Finger';
      } else if (slot === 'Trinket1' || slot === 'Trinket2' || slot === 'Trinket') {
        where.slot = 'Trinket';
      } else if (slot === 'Weapon1' || slot === 'MainHand') {
        // Main hand can use MainHand, OneHand, or TwoHand weapons
        where.slot = { in: ['MainHand', 'OneHand', 'TwoHand'] };
      } else if (slot === 'Weapon2' || slot === 'OffHand') {
        // Off hand can use OffHand, OneHand, Shield, or HeldInOffhand
        where.slot = { in: ['OffHand', 'OneHand', 'Shield', 'HeldInOffhand'] };
      } else if (slot === 'Ranged') {
        // Ranged slot includes ranged, wand, thrown, relic
        where.slot = { in: ['Ranged', 'Wand', 'Thrown', 'Relic'] };
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
