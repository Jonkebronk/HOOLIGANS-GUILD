import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { SPEC_ROLES } from '@hooligans/shared';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const players = await prisma.player.findMany({
      where: {
        active: true,
        ...(teamId && { teamId }),
      },
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

    // Bulk import mode: create multiple players from Discord members with optional class/spec
    if (body.mode === 'bulk' && (Array.isArray(body.members) || Array.isArray(body.discordIds))) {
      const teamId = body.teamId;
      const createdPlayers = [];
      const skipped = [];

      // Support both old format (discordIds) and new format (members with class/spec)
      const members: { discordId: string; displayName?: string | null; wowClass?: string | null; mainSpec?: string | null }[] =
        body.members || body.discordIds.map((id: string) => ({ discordId: id }));

      for (const member of members) {
        const { discordId, displayName, wowClass, mainSpec } = member;

        // Skip if already exists in this team
        const existing = await prisma.player.findFirst({
          where: { discordId, ...(teamId && { teamId }) },
        });
        if (existing) {
          skipped.push(discordId);
          continue;
        }

        // Determine if player has class/spec configured
        const hasConfig = wowClass && mainSpec;
        const specRole = mainSpec ? SPEC_ROLES[mainSpec] : null;

        // Use display name if available, otherwise create pending name
        const playerName = displayName || `Pending-${discordId.slice(-6)}`;
        const isPending = !displayName || !hasConfig;

        // Create player - either configured or pending
        const player = await prisma.player.create({
          data: {
            name: playerName,
            class: wowClass || 'Warrior',
            mainSpec: mainSpec || 'WarriorFury',
            role: specRole?.role || 'DPS',
            roleSubtype: specRole?.subtype || 'DPS_Melee',
            discordId,
            notes: isPending ? 'PENDING - needs configuration' : null,
            ...(teamId && { teamId }),
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
    const { name, wowClass, mainSpec, offSpec, role, roleSubtype, notes, discordId, teamId } = body;

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
        ...(teamId && { teamId }),
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}

// PATCH - Assign unassigned players to a team
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Update all players without a teamId
    const result = await prisma.player.updateMany({
      where: { teamId: null },
      data: { teamId },
    });

    return NextResponse.json({
      updated: result.count,
      message: `Assigned ${result.count} players to team`,
    });
  } catch (error) {
    console.error('Failed to assign players:', error);
    return NextResponse.json({ error: 'Failed to assign players' }, { status: 500 });
  }
}
