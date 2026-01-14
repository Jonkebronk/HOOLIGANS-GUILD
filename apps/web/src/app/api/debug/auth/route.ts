import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Debug endpoint to check auth and Discord role status
export async function GET() {
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Check session
    const session = await auth();
    debug.hasSession = !!session;
    debug.userId = session?.user?.id || null;
    debug.userEmail = session?.user?.email || null;

    if (!session?.user?.id) {
      debug.error = 'Not authenticated';
      return NextResponse.json(debug);
    }

    // 2. Check user in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, discordId: true, discordName: true, email: true },
    });
    debug.dbUser = user;
    debug.hasDiscordId = !!user?.discordId;

    if (!user?.discordId) {
      debug.error = 'No Discord ID in database - user needs to re-login';
      return NextResponse.json(debug);
    }

    // 3. Check environment variables
    debug.hasBotToken = !!DISCORD_BOT_TOKEN;
    debug.hasGuildId = !!DISCORD_GUILD_ID;
    debug.guildId = DISCORD_GUILD_ID;

    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      debug.error = 'Discord bot not configured';
      return NextResponse.json(debug);
    }

    // 4. Try to fetch Discord member
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.discordId}`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    debug.memberFetchStatus = memberRes.status;

    if (!memberRes.ok) {
      const errorText = await memberRes.text();
      debug.memberFetchError = errorText;
      debug.error = `Discord API error: ${memberRes.status}`;
      return NextResponse.json(debug);
    }

    const member = await memberRes.json();
    debug.memberRoleIds = member.roles || [];

    // 5. Fetch all guild roles
    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
      {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!rolesRes.ok) {
      debug.error = `Failed to fetch guild roles: ${rolesRes.status}`;
      return NextResponse.json(debug);
    }

    const allRoles = await rolesRes.json();

    // Map role IDs to names
    const userRoleNames = allRoles
      .filter((role: { id: string; name: string }) =>
        member.roles.includes(role.id) && role.name !== '@everyone'
      )
      .map((role: { name: string }) => role.name);

    debug.userRoleNames = userRoleNames;
    debug.userRoleNamesLower = userRoleNames.map((r: string) => r.toLowerCase());

    // 6. Check officer/GM status
    const lowerRoles = userRoleNames.map((r: string) => r.toLowerCase());
    const isGM = lowerRoles.some((name: string) =>
      name.includes('gm') || name.includes('guild master') || name.includes('guildmaster')
    );
    const isOfficer = isGM || lowerRoles.some((name: string) =>
      name.includes('officer') || name.includes('raid lead')
    );

    debug.isGM = isGM;
    debug.isOfficer = isOfficer;

    // 7. Check teams in database
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });
    debug.teamsInDb = teams;
    debug.teamCount = teams.length;

    // 8. Check team membership
    const memberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      include: { team: { select: { name: true } } },
    });
    debug.teamMemberships = memberships.map(m => ({
      teamName: m.team.name,
      role: m.role,
    }));

    debug.success = true;
    return NextResponse.json(debug);
  } catch (error) {
    debug.error = `Exception: ${error}`;
    return NextResponse.json(debug);
  }
}
