import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import type { GearSlot, Phase } from '@prisma/client';

// Map from simple slot names to GearSlot enum
const SLOT_MAP: Record<string, GearSlot> = {
  tier: 'Chest', // Tier token covers multiple slots, we'll use Chest as placeholder
  head: 'Head',
  shoulder: 'Shoulder',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;
    const body = await request.json();
    const { slot, obtained, phase = 'P1' } = body as {
      slot: string;
      obtained: boolean;
      phase?: Phase;
    };

    if (!slot) {
      return NextResponse.json({ error: 'Missing slot' }, { status: 400 });
    }

    const gearSlot = SLOT_MAP[slot.toLowerCase()];
    if (!gearSlot) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    // Upsert the PlayerBisStatus record
    const bisStatus = await prisma.playerBisStatus.upsert({
      where: {
        playerId_slot_phase: {
          playerId,
          slot: gearSlot,
          phase,
        },
      },
      update: {
        obtained,
        obtainedDate: obtained ? new Date() : null,
      },
      create: {
        playerId,
        slot: gearSlot,
        phase,
        obtained,
        obtainedDate: obtained ? new Date() : null,
      },
    });

    return NextResponse.json(bisStatus);
  } catch (error) {
    console.error('Failed to update BiS status:', error);
    return NextResponse.json(
      { error: 'Failed to update BiS status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;
    const { searchParams } = new URL(request.url);
    const phase = (searchParams.get('phase') as Phase) || 'P1';

    const bisStatuses = await prisma.playerBisStatus.findMany({
      where: {
        playerId,
        phase,
      },
    });

    // Convert to simple slot -> obtained map
    const slotStatus: Record<string, boolean> = {};
    for (const [key, gearSlot] of Object.entries(SLOT_MAP)) {
      const status = bisStatuses.find((s) => s.slot === gearSlot);
      slotStatus[key] = status?.obtained ?? false;
    }

    return NextResponse.json(slotStatus);
  } catch (error) {
    console.error('Failed to fetch BiS status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BiS status' },
      { status: 500 }
    );
  }
}
