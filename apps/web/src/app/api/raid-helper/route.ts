import { NextResponse } from 'next/server';

const RAID_HELPER_API = 'https://raid-helper.dev/api';

// GET /api/raid-helper?serverId=xxx - Fetch scheduled events
// GET /api/raid-helper?eventId=xxx - Fetch single event with signups
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const eventId = searchParams.get('eventId');
    const apiKey = request.headers.get('x-api-key');

    if (eventId) {
      // Fetch single event with signups (no auth required for public events)
      const res = await fetch(`${RAID_HELPER_API}/v2/events/${eventId}`, {
        headers: apiKey ? { 'Authorization': apiKey } : {},
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch event: ${res.status}` },
          { status: res.status }
        );
      }

      const event = await res.json();
      return NextResponse.json(event);
    }

    if (serverId) {
      // Fetch all scheduled events for a server
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = apiKey;
      }

      const res = await fetch(
        `${RAID_HELPER_API}/v3/servers/${serverId}/scheduledevents`,
        { headers }
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch events: ${res.status}` },
          { status: res.status }
        );
      }

      const events = await res.json();
      return NextResponse.json(events);
    }

    return NextResponse.json(
      { error: 'Either serverId or eventId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Raid-Helper API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Raid-Helper' },
      { status: 500 }
    );
  }
}

// POST /api/raid-helper/import - Import signups as available characters
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signups, mode } = body;

    // Mode can be 'parse' (from pasted text) or 'api' (from Raid-Helper API response)
    if (mode === 'parse' && body.text) {
      // Parse pasted signup text from Discord
      const parsed = parseDiscordSignups(body.text);
      return NextResponse.json({ signups: parsed });
    }

    if (!signups || !Array.isArray(signups)) {
      return NextResponse.json(
        { error: 'Signups array is required' },
        { status: 400 }
      );
    }

    // Transform Raid-Helper signups to our format
    const transformed = signups.map((signup: RaidHelperSignup) => ({
      name: signup.name || signup.specName || 'Unknown',
      discordId: signup.odUserId || signup.odMemberId || signup.userId,
      class: mapRaidHelperClass(signup.className || signup.class),
      spec: signup.specName || signup.spec,
      role: signup.role,
      entryTime: signup.entryTime,
    }));

    return NextResponse.json({ signups: transformed });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process signups' },
      { status: 500 }
    );
  }
}

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
}

// Map Raid-Helper class names to our format
function mapRaidHelperClass(className: string | undefined): string {
  if (!className) return 'Unknown';

  const classMap: Record<string, string> = {
    'warrior': 'Warrior',
    'paladin': 'Paladin',
    'hunter': 'Hunter',
    'rogue': 'Rogue',
    'priest': 'Priest',
    'shaman': 'Shaman',
    'mage': 'Mage',
    'warlock': 'Warlock',
    'druid': 'Druid',
    // Handle capitalized versions too
    'Warrior': 'Warrior',
    'Paladin': 'Paladin',
    'Hunter': 'Hunter',
    'Rogue': 'Rogue',
    'Priest': 'Priest',
    'Shaman': 'Shaman',
    'Mage': 'Mage',
    'Warlock': 'Warlock',
    'Druid': 'Druid',
  };

  return classMap[className] || className;
}

// Parse Discord signup text (from copy-pasting Raid-Helper message)
function parseDiscordSignups(text: string): Array<{
  name: string;
  discordId?: string;
  class?: string;
  spec?: string;
}> {
  const signups: Array<{
    name: string;
    discordId?: string;
    class?: string;
    spec?: string;
  }> = [];

  // Match @mentions pattern: @Username or <@123456789>
  const mentionPattern = /@(\w+)|<@!?(\d+)>/g;

  // Match player entries like "✓ [icon] Playername" or "Playername"
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.includes('Group') || line.includes('Sent by')) continue;

    // Extract player name (after emoji/icon, before any slash)
    const nameMatch = line.match(/[✓✔☑️]?\s*(?:[\u{1F300}-\u{1F9FF}]|[\u2600-\u26FF]|\p{Emoji})*\s*(\w+)/u);
    if (nameMatch) {
      const name = nameMatch[1];

      // Try to extract Discord ID from mentions at the start
      const discordMatch = line.match(/<@!?(\d+)>/);

      signups.push({
        name,
        discordId: discordMatch ? discordMatch[1] : undefined,
      });
    }
  }

  return signups;
}
