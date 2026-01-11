// Warcraft Logs API v2 (GraphQL) integration
// Docs: https://www.warcraftlogs.com/v2-api-docs/

const WCL_CLIENT_ID = process.env.WCL_CLIENT_ID;
const WCL_CLIENT_SECRET = process.env.WCL_CLIENT_SECRET;
const WCL_API_URL = 'https://www.warcraftlogs.com/api/v2/client';
const WCL_TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';

// Cache token to avoid fetching on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

export interface WCLCharacterData {
  name: string;
  classID: number;
  bestPerformanceAverage: number | null;
  medianPerformanceAverage: number | null;
  parseCount: number;
  rankings: Array<{
    encounter: { name: string };
    rankPercent: number;
    bestAmount: number;
  }>;
}

export interface WCLParsedUrl {
  region: string;
  server: string;
  name: string;
}

// Parse Warcraft Logs URL to extract character info
// Formats:
// - https://classic.warcraftlogs.com/character/eu/firemaw/playername
// - https://www.warcraftlogs.com/character/eu/firemaw/playername
export function parseWclUrl(url: string): WCLParsedUrl | null {
  const match = url.match(/warcraftlogs\.com\/character\/(\w+)\/([^\/]+)\/([^\/\?#]+)/i);
  if (match) {
    return {
      region: match[1].toLowerCase(),
      server: match[2].toLowerCase().replace(/-/g, ' '),
      name: decodeURIComponent(match[3]),
    };
  }
  return null;
}

// Get OAuth access token using client credentials flow
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.token;
  }

  if (!WCL_CLIENT_ID || !WCL_CLIENT_SECRET) {
    throw new Error('Warcraft Logs credentials not configured');
  }

  const credentials = Buffer.from(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(WCL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WCL access token: ${error}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.token;
}

// Query WCL GraphQL API
async function queryWcl<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(WCL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WCL API error: ${error}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`WCL GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`);
  }

  return result.data;
}

// Fetch character performance data
// zoneID for TBC Classic content:
// - 1010 = Black Temple / Hyjal
// - 1011 = Sunwell Plateau
// For Classic Era/Season of Discovery, different IDs apply
export async function getCharacterData(
  name: string,
  server: string,
  region: string,
  zoneID?: number
): Promise<WCLCharacterData | null> {
  // Default to most recent raid tier
  const effectiveZoneID = zoneID || 1017; // Classic Anniversary zone

  const query = `
    query CharacterData($name: String!, $server: String!, $region: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $server, serverRegion: $region) {
          name
          classID
          zoneRankings(zoneID: $zoneID) {
            bestPerformanceAverage
            medianPerformanceAverage
            rankings {
              encounter {
                name
              }
              rankPercent
              bestAmount
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryWcl<{
      characterData: {
        character: {
          name: string;
          classID: number;
          zoneRankings: {
            bestPerformanceAverage: number | null;
            medianPerformanceAverage: number | null;
            rankings: Array<{
              encounter: { name: string };
              rankPercent: number;
              bestAmount: number;
            }>;
          } | null;
        } | null;
      };
    }>(query, {
      name,
      server: server.replace(/ /g, '-'),
      region,
      zoneID: effectiveZoneID,
    });

    const character = data.characterData?.character;
    if (!character) {
      return null;
    }

    const zoneRankings = character.zoneRankings;
    return {
      name: character.name,
      classID: character.classID,
      bestPerformanceAverage: zoneRankings?.bestPerformanceAverage ?? null,
      medianPerformanceAverage: zoneRankings?.medianPerformanceAverage ?? null,
      parseCount: zoneRankings?.rankings?.length ?? 0,
      rankings: zoneRankings?.rankings ?? [],
    };
  } catch (error) {
    console.error('Failed to fetch WCL character data:', error);
    return null;
  }
}

// Lookup character from WCL URL
export async function lookupFromUrl(url: string, zoneID?: number): Promise<WCLCharacterData | null> {
  const parsed = parseWclUrl(url);
  if (!parsed) {
    throw new Error('Invalid Warcraft Logs URL format');
  }

  return getCharacterData(parsed.name, parsed.server, parsed.region, zoneID);
}
