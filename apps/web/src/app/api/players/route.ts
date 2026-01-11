import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(players);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Bulk import mode: create multiple pending players from Discord IDs
    if (body.mode === 'bulk' && Array.isArray(body.discordIds)) {
      const discordIds = body.discordIds as string[];
      const createdPlayers = [];
      const skipped = [];

      for (const discordId of discordIds) {
        // Skip if already exists
        const existing = await prisma.player.findFirst({
          where: { discordId },
        });
        if (existing) {
          skipped.push(discordId);
          continue;
        }

        // Create pending player with placeholder name
        const player = await prisma.player.create({
          data: {
            name: `Pending-${discordId.slice(-6)}`,
            class: 'Warrior', // Default, will be updated
            mainSpec: 'WarriorFury', // Default, will be updated
            role: 'DPS',
            roleSubtype: 'DPS_Melee',
            discordId,
            notes: 'PENDING - needs configuration',
          },
        });
        createdPlayers.push(player);
      }

      return NextResponse.json({
        created: createdPlayers,
        skipped,
        message: `Created ${createdPlayers.length} players, skipped ${skipped.length} duplicates`,
      }, { status: 201 });
    }

    // Single player creation
    const { name, wowClass, mainSpec, offSpec, role, roleSubtype, notes, discordId } = body;

    const player = await prisma.player.create({
      data: {
        name,
        class: wowClass,
        mainSpec,
        offSpec,
        role,
        roleSubtype,
        notes,
        discordId,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
