import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

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
