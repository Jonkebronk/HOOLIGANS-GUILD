import { NextRequest, NextResponse } from 'next/server';
import { lookupFromUrl, parseWclUrl, getCharacterData } from '@/lib/warcraft-logs';

// POST - Lookup character from WCL URL or direct params
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, name, server, region, zoneID } = body;

    // If URL provided, parse and lookup
    if (url) {
      const parsed = parseWclUrl(url);
      if (!parsed) {
        return NextResponse.json(
          { error: 'Invalid Warcraft Logs URL format. Expected: https://classic.warcraftlogs.com/character/region/server/name' },
          { status: 400 }
        );
      }

      const data = await lookupFromUrl(url, zoneID);
      if (!data) {
        return NextResponse.json(
          { error: 'Character not found or no logs available' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...data,
        parsed, // Include parsed URL info for reference
      });
    }

    // Direct lookup with name/server/region
    if (name && server && region) {
      const data = await getCharacterData(name, server, region, zoneID);
      if (!data) {
        return NextResponse.json(
          { error: 'Character not found or no logs available' },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Either url or (name, server, region) must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('WCL lookup error:', error);
    const message = error instanceof Error ? error.message : 'Failed to lookup character';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
