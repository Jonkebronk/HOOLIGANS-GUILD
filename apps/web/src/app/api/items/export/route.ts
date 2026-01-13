import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      include: {
        bisSpecs: true,
      },
      orderBy: [
        { raid: 'asc' },
        { boss: 'asc' },
        { name: 'asc' },
      ],
    });

    // CSV header
    const headers = [
      'Name',
      'Wowhead ID',
      'Wowhead URL',
      'Slot',
      'Quality',
      'Raid',
      'Boss',
      'Phase',
      'Loot Priority',
      'BiS Specs',
    ];

    // Quality names
    const qualityNames: Record<number, string> = {
      0: 'Poor',
      1: 'Common',
      2: 'Uncommon',
      3: 'Rare',
      4: 'Epic',
      5: 'Legendary',
    };

    // Build CSV rows
    const rows = items.map((item) => {
      const bisSpecsStr = item.bisSpecs.map((bs) => bs.spec).join('; ');
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        item.wowheadId,
        `https://www.wowhead.com/tbc/item=${item.wowheadId}`,
        item.slot,
        qualityNames[item.quality] || item.quality,
        item.raid,
        item.boss,
        item.phase,
        item.lootPriority ? `"${item.lootPriority.replace(/"/g, '""')}"` : '',
        `"${bisSpecsStr}"`,
      ].join(',');
    });

    // Combine header and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hooligans-items-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export items:', error);
    return NextResponse.json({ error: 'Failed to export items' }, { status: 500 });
  }
}
