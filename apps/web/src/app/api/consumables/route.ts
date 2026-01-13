import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// Fetch consumable details from Wowhead tooltip API
async function fetchConsumableDetails(wowheadId: number): Promise<{
  name: string;
  icon: string;
} | null> {
  try {
    // Use Wowhead's tooltip API (dataEnv=5 is TBC)
    const tooltipUrl = `https://nether.wowhead.com/tooltip/item/${wowheadId}?dataEnv=5&locale=0`;
    const response = await fetch(tooltipUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    return {
      name: data.name || `Item ${wowheadId}`,
      icon: data.icon || 'inv_misc_questionmark',
    };
  } catch (error) {
    console.error(`Failed to fetch consumable ${wowheadId}:`, error);
    return null;
  }
}

// GET - Fetch all consumables with their spec configs
export async function GET() {
  try {
    const consumables = await prisma.consumable.findMany({
      include: {
        specConfigs: {
          orderBy: [
            { priority: 'asc' }, // 'best' before 'alternative'
            { sortOrder: 'asc' },
          ],
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(consumables);
  } catch (error) {
    console.error('Failed to fetch consumables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consumables' },
      { status: 500 }
    );
  }
}

// POST - Add a new consumable by Wowhead ID
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wowheadId, type } = body;

    if (!wowheadId || !type) {
      return NextResponse.json(
        { error: 'wowheadId and type are required' },
        { status: 400 }
      );
    }

    // Check if consumable already exists
    const existing = await prisma.consumable.findUnique({
      where: { wowheadId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Consumable with this Wowhead ID already exists', consumable: existing },
        { status: 409 }
      );
    }

    // Fetch details from Wowhead
    const details = await fetchConsumableDetails(wowheadId);

    if (!details) {
      return NextResponse.json(
        { error: 'Could not fetch consumable details from Wowhead. Check the ID.' },
        { status: 404 }
      );
    }

    // Create the consumable
    const consumable = await prisma.consumable.create({
      data: {
        wowheadId,
        name: details.name,
        icon: details.icon,
        type,
      },
    });

    return NextResponse.json(consumable);
  } catch (error) {
    console.error('Failed to create consumable:', error);
    return NextResponse.json(
      { error: 'Failed to create consumable' },
      { status: 500 }
    );
  }
}
