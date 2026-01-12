import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// Raid to Phase mapping
const RAID_PHASE_MAP: Record<string, string> = {
  'Karazhan': 'P1',
  "Gruul's Lair": 'P1',
  "Magtheridon's Lair": 'P1',
  'Serpentshrine Cavern': 'P2',
  'Tempest Keep': 'P2',
  'Mount Hyjal': 'P3',
  'Black Temple': 'P3',
  "Zul'Aman": 'P4',
  'Sunwell Plateau': 'P5',
};

export async function POST() {
  try {
    const results: Record<string, number> = {};

    // Update each raid's items to the correct phase
    for (const [raid, phase] of Object.entries(RAID_PHASE_MAP)) {
      const updateResult = await prisma.item.updateMany({
        where: { raid },
        data: { phase },
      });
      results[raid] = updateResult.count;
    }

    const totalUpdated = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      totalUpdated,
      byRaid: results,
    });
  } catch (error) {
    console.error('Failed to fix phases:', error);
    return NextResponse.json(
      { error: 'Failed to fix phases', details: String(error) },
      { status: 500 }
    );
  }
}
