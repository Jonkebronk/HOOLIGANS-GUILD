import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

const RAID_HELPER_API = 'https://raid-helper.dev/api';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

interface RaidHelperSignup {
  name?: string;
  odUserId?: string;
  odMemberId?: string;
  userId?: string;
  className?: string;
  class?: string;
  specName?: string;
  spec?: string;
  role?: string;
  entryTime?: string;
  status?: string;
}

interface RaidHelperEvent {
  id: string;
  title?: string;
  startTime?: string;
  signUps?: RaidHelperSignup[];
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const apiKey = request.headers.get('x-api-key');

    // Fetch event with signups from RaidHelper
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = apiKey;
    }

    const res = await fetch(`${RAID_HELPER_API}/v2/events/${eventId}`, {
      headers,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch event: ${res.status}` },
        { status: res.status }
      );
    }

    const event: RaidHelperEvent = await res.json();

    if (!event.signUps || !Array.isArray(event.signUps)) {
      return NextResponse.json({
        eventId,
        title: event.title,
        signups: [],
        mappedPlayers: [],
      });
    }

    // Get all players from database for this team
    const players = await prisma.player.findMany({
      where: {
        active: true,
        ...(teamId && { teamId }),
      },
      select: {
        id: true,
        name: true,
        class: true,
        discordId: true,
        mainSpec: true,
        role: true,
        roleSubtype: true,
      },
    });

    // Create lookup maps
    const playersByDiscordId = new Map(
      players.filter(p => p.discordId).map(p => [p.discordId, p])
    );
    const playersByName = new Map(
      players.map(p => [p.name.toLowerCase(), p])
    );

    // Map signups to players
    const mappedSignups = event.signUps.map((signup) => {
      const discordId = signup.odUserId || signup.odMemberId || signup.userId;
      const signupName = signup.name || signup.specName || 'Unknown';

      // Try to find matching player
      let matchedPlayer = null;

      // First try by Discord ID
      if (discordId && playersByDiscordId.has(discordId)) {
        matchedPlayer = playersByDiscordId.get(discordId);
      }

      // Then try by name (case insensitive)
      if (!matchedPlayer && signupName) {
        matchedPlayer = playersByName.get(signupName.toLowerCase());
      }

      return {
        signupName,
        discordId,
        className: signup.className || signup.class,
        specName: signup.specName || signup.spec,
        role: signup.role,
        status: signup.status,
        entryTime: signup.entryTime,
        // Matched player from our database
        player: matchedPlayer ? {
          id: matchedPlayer.id,
          name: matchedPlayer.name,
          class: matchedPlayer.class,
          discordId: matchedPlayer.discordId,
          mainSpec: matchedPlayer.mainSpec,
          role: matchedPlayer.role,
          roleSubtype: matchedPlayer.roleSubtype,
        } : null,
        matched: !!matchedPlayer,
      };
    });

    // Filter to only signed-up players (not absences/tentatives if needed)
    const confirmedSignups = mappedSignups.filter(s =>
      !s.status || s.status === 'primary' || s.status === 'confirmed'
    );

    return NextResponse.json({
      eventId,
      title: event.title,
      startTime: event.startTime,
      totalSignups: event.signUps.length,
      confirmedSignups: confirmedSignups.length,
      matchedPlayers: confirmedSignups.filter(s => s.matched).length,
      signups: confirmedSignups,
    });
  } catch (error) {
    console.error('Failed to fetch RaidHelper signups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signups from RaidHelper' },
      { status: 500 }
    );
  }
}
