import { auth } from '@/lib/auth';
import { prisma } from '@hooligans/database';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Team role name mappings (Discord role name -> Team name)
const TEAM_ROLE_MAPPINGS: Record<string, string> = {
  'team sweden': 'Team Sweden',
  'team nato': 'Team Nato',
  'pugs': 'PuGs',
};

// Officer role names (case-insensitive)
const OFFICER_ROLE_PATTERNS = ['gm', 'officer'];

export type UserPermissions = {
  isOfficer: boolean;
  accessibleTeamNames: string[];
  allRoles: string[];
};

/**
 * Fetch user's Discord roles from Discord API
 */
export async function getUserDiscordRoles(discordId: string): Promise<string[]> {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    console.error('Discord bot not configured');
    return [];
  }

  try {
    // Fetch member from Discord
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberRes.ok) {
      console.error(`Discord member fetch failed: ${memberRes.status}`);
      return [];
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
      console.error(`Discord roles fetch failed: ${rolesRes.status}`);
      return [];
    }

    const allRoles = await rolesRes.json();

    // Get user's role names
    const userRoleNames = allRoles
      .filter((role: { id: string; name: string }) =>
        memberRoleIds.includes(role.id) && role.name !== '@everyone'
      )
      .map((role: { name: string }) => role.name);

    return userRoleNames;
  } catch (error) {
    console.error('Failed to fetch Discord roles:', error);
    return [];
  }
}

/**
 * Check if user has officer permissions (GM or Officer role)
 */
export function isOfficer(roles: string[]): boolean {
  const lowerRoles = roles.map(r => r.toLowerCase());
  return lowerRoles.some(role =>
    OFFICER_ROLE_PATTERNS.some(pattern => role.includes(pattern))
  );
}

/**
 * Get team names the user can access based on their Discord roles
 */
export function getAccessibleTeamNames(roles: string[]): string[] {
  const lowerRoles = roles.map(r => r.toLowerCase());
  const teamNames: string[] = [];

  for (const [rolePattern, teamName] of Object.entries(TEAM_ROLE_MAPPINGS)) {
    if (lowerRoles.some(role => role.includes(rolePattern))) {
      teamNames.push(teamName);
    }
  }

  return teamNames;
}

/**
 * Get full user permissions from session
 */
export async function getUserPermissions(): Promise<UserPermissions | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's Discord ID
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { discordId: true },
  });

  if (!user?.discordId) {
    return {
      isOfficer: false,
      accessibleTeamNames: [],
      allRoles: [],
    };
  }

  const roles = await getUserDiscordRoles(user.discordId);
  const officer = isOfficer(roles);
  const teamNames = getAccessibleTeamNames(roles);

  return {
    isOfficer: officer,
    accessibleTeamNames: teamNames,
    allRoles: roles,
  };
}

/**
 * Check if user can access a specific team
 */
export async function canAccessTeam(teamId: string): Promise<boolean> {
  const permissions = await getUserPermissions();

  if (!permissions) {
    return false;
  }

  // Officers can access all teams
  if (permissions.isOfficer) {
    return true;
  }

  // Get team name
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true },
  });

  if (!team) {
    return false;
  }

  // Check if user has access to this team
  return permissions.accessibleTeamNames.some(
    name => name.toLowerCase() === team.name.toLowerCase()
  );
}

/**
 * Check if user has officer permissions (for write operations)
 */
export async function requireOfficer(): Promise<{ authorized: boolean; error?: string }> {
  const permissions = await getUserPermissions();

  if (!permissions) {
    return { authorized: false, error: 'Not authenticated' };
  }

  if (!permissions.isOfficer) {
    return { authorized: false, error: 'Officer permission required' };
  }

  return { authorized: true };
}

/**
 * Check if user can access a player (player must belong to user's accessible teams)
 */
export async function canAccessPlayer(playerId: string): Promise<boolean> {
  const permissions = await getUserPermissions();

  if (!permissions) {
    return false;
  }

  // Officers can access all players
  if (permissions.isOfficer) {
    return true;
  }

  // Get player's team
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      team: {
        select: { name: true },
      },
    },
  });

  if (!player?.team) {
    return false;
  }

  // Check if user has access to this player's team
  return permissions.accessibleTeamNames.some(
    name => name.toLowerCase() === player.team!.name.toLowerCase()
  );
}
