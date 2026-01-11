import { NextResponse } from 'next/server';
import { prisma, GearSlot, Phase } from '@hooligans/database';

// Import TBC items data to look up item names
import tbcItemsData from '../../../../../../../packages/shared/src/data/tbc-items.json';

interface TbcItemData {
  id: number;
  name: string;
  slot: string;
  phase: number;
  quality: string;
}

const tbcItems = tbcItemsData as TbcItemData[];

// Look up item name from our TBC items database
function lookupItemName(wowheadId: number): string {
  const item = tbcItems.find((i) => i.id === wowheadId);
  return item?.name || `Item #${wowheadId}`;
}

// Valid gear slots
const VALID_SLOTS = [
  'Head',
  'Neck',
  'Shoulder',
  'Back',
  'Chest',
  'Wrist',
  'Hands',
  'Waist',
  'Legs',
  'Feet',
  'Finger1',
  'Finger2',
  'Trinket1',
  'Trinket2',
  'MainHand',
  'OffHand',
  'Ranged',
];

// POST - Import entire BiS preset for a spec/phase
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spec, phase, items, source } = body;

    if (!spec || !phase || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: spec, phase, items' },
        { status: 400 }
      );
    }

    // Validate phase
    const validPhases = ['P1', 'P2', 'P3', 'P4', 'P5'];
    if (!validPhases.includes(phase)) {
      return NextResponse.json(
        { error: `Invalid phase: ${phase}. Must be one of ${validPhases.join(', ')}` },
        { status: 400 }
      );
    }

    // Delete existing config for this spec/phase
    await prisma.bisConfiguration.deleteMany({
      where: {
        spec,
        phase: phase as Phase,
      },
    });

    // Create new entries for each item
    const createdItems = [];
    for (const item of items) {
      // Validate slot
      if (!item.slot || !VALID_SLOTS.includes(item.slot)) {
        console.warn(`Skipping invalid slot: ${item.slot}`);
        continue;
      }

      // Skip items without a valid wowheadId
      if (!item.wowheadId || typeof item.wowheadId !== 'number') {
        console.warn(`Skipping item without valid wowheadId for slot ${item.slot}`);
        continue;
      }

      const itemName = lookupItemName(item.wowheadId);

      const created = await prisma.bisConfiguration.create({
        data: {
          spec,
          phase: phase as Phase,
          slot: item.slot as GearSlot,
          wowheadId: item.wowheadId,
          itemName,
          source: source || 'WoWSims Preset',
        },
      });

      createdItems.push(created);
    }

    return NextResponse.json({
      success: true,
      imported: createdItems.length,
      message: `Imported ${createdItems.length} items for ${spec} ${phase}`,
    });
  } catch (error) {
    console.error('BiS import error:', error);
    return NextResponse.json(
      { error: 'Failed to import BiS configuration' },
      { status: 500 }
    );
  }
}
