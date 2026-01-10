import { NextResponse } from 'next/server';
import { prisma, GearSlot, Phase } from '@hooligans/database';

// GET - Retrieve BiS configuration for a spec and phase
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spec = searchParams.get('spec');
    const phase = searchParams.get('phase') || 'P1';

    if (!spec) {
      return NextResponse.json(
        { error: 'Missing required parameter: spec' },
        { status: 400 }
      );
    }

    const bisConfig = await prisma.bisConfiguration.findMany({
      where: {
        spec,
        phase: phase as Phase,
      },
    });

    // Also fetch the actual item data for each BiS config
    const bisWithItems = await Promise.all(
      bisConfig.map(async (config) => {
        let item = null;
        if (config.wowheadId) {
          item = await prisma.item.findFirst({
            where: { wowheadId: config.wowheadId },
          });
        }
        return {
          ...config,
          item,
        };
      })
    );

    return NextResponse.json(bisWithItems);
  } catch (error) {
    console.error('BiS config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BiS configuration' },
      { status: 500 }
    );
  }
}

// POST - Save BiS configuration for a spec/phase/slot
export async function POST(request: Request) {
  try {
    const { spec, phase, slot, itemId } = await request.json();

    if (!spec || !phase || !slot) {
      return NextResponse.json(
        { error: 'Missing required fields: spec, phase, slot' },
        { status: 400 }
      );
    }

    // Get item details
    const item = itemId ? await prisma.item.findUnique({
      where: { id: itemId },
    }) : null;

    // Upsert the BiS configuration
    const bisConfig = await prisma.bisConfiguration.upsert({
      where: {
        spec_phase_slot: {
          spec,
          phase: phase as Phase,
          slot: slot as GearSlot,
        },
      },
      update: {
        itemName: item?.name || '',
        wowheadId: item?.wowheadId || null,
        source: item ? `${item.raid} - ${item.boss}` : null,
      },
      create: {
        spec,
        phase: phase as Phase,
        slot: slot as GearSlot,
        itemName: item?.name || '',
        wowheadId: item?.wowheadId || null,
        source: item ? `${item.raid} - ${item.boss}` : null,
      },
    });

    return NextResponse.json(bisConfig);
  } catch (error) {
    console.error('BiS config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save BiS configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove BiS configuration for a spec/phase/slot
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spec = searchParams.get('spec');
    const phase = searchParams.get('phase');
    const slot = searchParams.get('slot');

    if (!spec || !phase || !slot) {
      return NextResponse.json(
        { error: 'Missing required parameters: spec, phase, slot' },
        { status: 400 }
      );
    }

    await prisma.bisConfiguration.delete({
      where: {
        spec_phase_slot: {
          spec,
          phase: phase as Phase,
          slot: slot as GearSlot,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('BiS config delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete BiS configuration' },
      { status: 500 }
    );
  }
}
