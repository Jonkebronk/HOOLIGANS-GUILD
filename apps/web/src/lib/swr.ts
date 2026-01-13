import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Items hook - 5 min cache with revalidation
export const useItems = (teamId?: string) => useSWR(
  teamId ? `/api/items?teamId=${teamId}` : null,
  fetcher,
  {
    revalidateOnFocus: true,
    dedupingInterval: 30000, // Don't make duplicate requests within 30s
  }
);

// Players hook - 1 min cache with revalidation
export const usePlayers = (teamId?: string) => useSWR(
  teamId ? `/api/players?teamId=${teamId}` : null,
  fetcher,
  {
    revalidateOnFocus: true,
    dedupingInterval: 15000,
  }
);

// Loot hook - 30s cache with auto-refresh
export const useLoot = (teamId?: string) => useSWR(
  teamId ? `/api/loot?teamId=${teamId}` : null,
  fetcher,
  {
    refreshInterval: 30000, // Auto-refresh every 30s for real-time updates
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  }
);

// Attendance hook
export const useAttendance = (teamId?: string) => useSWR(
  teamId ? `/api/attendance?teamId=${teamId}` : null,
  fetcher,
  {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  }
);

// Raids list hook
export const useRaids = (teamId?: string) => useSWR(
  teamId ? `/api/attendance?raids=true&teamId=${teamId}` : null,
  fetcher,
  {
    revalidateOnFocus: true,
    dedupingInterval: 60000,
  }
);

// BiS presets hook (static data, longer cache)
export const useBisPresets = (spec?: string) => useSWR(
  spec ? `/api/bis/presets?spec=${spec}` : null,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 min dedup for static data
  }
);

// Player BiS hook
export const usePlayerBis = (playerId?: string) => useSWR(
  playerId ? `/api/bis/${playerId}` : null,
  fetcher,
  {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  }
);
