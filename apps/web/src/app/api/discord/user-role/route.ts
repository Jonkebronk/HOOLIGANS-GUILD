import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json({ error: 'Discord bot not configured' }, { status: 500 });
  }

  try {
    // Get user's Discord ID from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { discordId: true },
    });

    if (!user?.discordId) {
      return NextResponse.json({ role: null });
    }

    // Fetch member from Discord
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.discordId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberRes.ok) {
      return NextResponse.json({ role: null });
    }

    const member = await memberRes.json();
    const memberRoleIds: string[] = member.roles || [];

    // Fetch all guild roles
    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!rolesRes.ok) {
      return NextResponse.json({ role: null });
    }

    const allRoles = await rolesRes.json();

    // Find the highest role the user has (by position)
    const userRoles = allRoles
      .filter((role: { id: string; name: string }) =>
        memberRoleIds.includes(role.id) && role.name !== '@everyone'
      )
      .sort((a: { position: number }, b: { position: number }) => b.position - a.position);

    const topRole = userRoles[0];

    // Check for officer/admin/GM roles by name
    const roleNames = userRoles.map((r: { name: string }) => r.name.toLowerCase());
    const isGM = roleNames.some((name: string) => name.includes('gm') || name.includes('guild master') || name.includes('guildmaster'));
    const isAdmin = roleNames.some((name: string) => name.includes('admin'));
    const isOfficer = roleNames.some((name: string) => name.includes('officer') || name.includes('raid lead'));

    // Debug: log all role names for troubleshooting
    console.log('User Discord roles:', roleNames);

    return NextResponse.json({
      role: topRole ? topRole.name : null,
      color: topRole?.color ? `#${topRole.color.toString(16).padStart(6, '0')}` : null,
      isGM,
      isAdmin,
      isOfficer,
      // Debug: include all role names
      allRoles: roleNames,
    });
  } catch (error) {
    console.error('Failed to fetch user Discord role:', error);
    return NextResponse.json({ role: null });
  }
}
