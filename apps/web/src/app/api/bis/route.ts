import { NextResponse } from 'next/server';
import { prisma, GearSlot, Phase } from '@hooligans/database';
import { fetchWowheadIcon } from '@/lib/wowhead';
import { auth } from '@/lib/auth';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Helper to check if user has officer permissions
async function checkOfficerPermission(): Promise<{ hasPermission: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { hasPermission: false, error: 'Not authenticated' };
  }

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return { hasPermission: false, error: 'Discord bot not configured' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true },
    });

    if (!user?.discordId) {
      return { hasPermission: false, error: 'No Discord account linked' };
    }

    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.discordId}`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!memberRes.ok) {
      return { hasPermission: false, error: 'Could not fetch Discord member' };
    }

    const member = await memberRes.json();
    const memberRoleIds: string[] = member.roles || [];

    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!rolesRes.ok) {
      return { hasPermission: false, error: 'Could not fetch Discord roles' };
    }

    const allRoles = await rolesRes.json();
    const userRoles = allRoles
      .filter((role: { id: string; name: string }) =>
        memberRoleIds.includes(role.id) && role.name !== '@everyone'
      );

    const roleNames = userRoles.map((r: { name: string }) => r.name.toLowerCase());
    const isGM = roleNames.some((name: string) => name.includes('gm') || name.includes('guild master') || name.includes('guildmaster'));
    const isAdmin = roleNames.some((name: string) => name.includes('admin'));
    const isOfficer = roleNames.some((name: string) => name.includes('officer') || name.includes('raid lead'));

    return { hasPermission: isGM || isAdmin || isOfficer };
  } catch (error) {
    console.error('Officer permission check error:', error);
    return { hasPermission: false, error: 'Permission check failed' };
  }
}

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

    // Also fetch the actual item data for each BiS config and backfill missing icons
    const bisWithItems = await Promise.all(
      bisConfig.map(async (config) => {
        let item = null;
        if (config.wowheadId) {
          item = await prisma.item.findFirst({
            where: { wowheadId: config.wowheadId },
          });
        }

        // Backfill icon if missing
        let icon = config.icon || item?.icon;
        if (!icon && config.wowheadId) {
          icon = await fetchWowheadIcon(config.wowheadId);
          // Save for next time
          if (icon) {
            await prisma.bisConfiguration.update({
              where: { id: config.id },
              data: { icon },
            });
          }
        }

        return {
          ...config,
          icon,
          item: item ? { ...item, icon: item.icon || icon } : null,
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
// Accepts either itemId (from our DB) or wowheadId + itemName (from TBC picker)
// Officers only
export async function POST(request: Request) {
  try {
    // Check officer permission
    const { hasPermission, error } = await checkOfficerPermission();
    if (!hasPermission) {
      return NextResponse.json(
        { error: error || 'Only officers can edit spec presets' },
        { status: 403 }
      );
    }

    const { spec, phase, slot, itemId, wowheadId, itemName } = await request.json();

    if (!spec || !phase || !slot) {
      return NextResponse.json(
        { error: 'Missing required fields: spec, phase, slot' },
        { status: 400 }
      );
    }

    // Get item details from our database if itemId is provided
    const item = itemId ? await prisma.item.findUnique({
      where: { id: itemId },
    }) : null;

    // Determine final values - prefer itemId lookup, fall back to direct wowheadId/itemName
    const finalWowheadId = item?.wowheadId || wowheadId || null;
    const finalItemName = item?.name || itemName || '';
    const finalSource = item ? `${item.raid} - ${item.boss}` : 'TBC Item Database';

    // Get icon - from item first, then fetch from Wowhead if needed
    let finalIcon = item?.icon || null;
    if (!finalIcon && finalWowheadId) {
      finalIcon = await fetchWowheadIcon(finalWowheadId);
    }

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
        itemName: finalItemName,
        wowheadId: finalWowheadId,
        source: finalSource,
        icon: finalIcon,
      },
      create: {
        spec,
        phase: phase as Phase,
        slot: slot as GearSlot,
        itemName: finalItemName,
        wowheadId: finalWowheadId,
        source: finalSource,
        icon: finalIcon,
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
// Officers only
export async function DELETE(request: Request) {
  try {
    // Check officer permission
    const { hasPermission, error } = await checkOfficerPermission();
    if (!hasPermission) {
      return NextResponse.json(
        { error: error || 'Only officers can edit spec presets' },
        { status: 403 }
      );
    }

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
