// Loot Optimizer for 10-man Karazhan splits
// Distributes players across groups to minimize loot competition

type Player = {
  id: string;
  name: string;
  class: string;
  role: string;
  roleSubtype?: string;
};

type Needer = {
  playerId: string | null;
  name: string;
  class: string;
  hasReceived: boolean;
};

type KarazhanItem = {
  id: string;
  name: string;
  needers: Needer[];
};

type GroupSlot = {
  player: Player | null;
};

// Role composition for 10-man Karazhan
// 2 tanks, 2 healers, 3 melee DPS, 3 ranged DPS
const ROLE_LIMITS = {
  Tank: 2,
  Healer: 2,
  MeleeDPS: 3,
  RangedDPS: 3,
};

// Map role/roleSubtype to our categories
function getRoleCategory(player: Player): 'Tank' | 'Healer' | 'MeleeDPS' | 'RangedDPS' {
  if (player.role === 'Tank') return 'Tank';
  if (player.role === 'Healer') return 'Healer';
  if (player.role === 'DPS') {
    // Check roleSubtype for melee vs ranged
    if (player.roleSubtype === 'Melee') return 'MeleeDPS';
    if (player.roleSubtype === 'Ranged') return 'RangedDPS';
    // Fallback based on class
    const meleeClasses = ['Warrior', 'Rogue'];
    const rangedClasses = ['Mage', 'Warlock', 'Hunter'];
    if (meleeClasses.includes(player.class)) return 'MeleeDPS';
    if (rangedClasses.includes(player.class)) return 'RangedDPS';
    // Hybrid classes - default based on common specs
    return 'MeleeDPS'; // Default to melee if unknown
  }
  return 'MeleeDPS'; // Fallback
}

// Build conflict matrix: how many items do two players both need (and haven't received)
function buildConflictMatrix(
  players: Player[],
  items: KarazhanItem[]
): Map<string, Map<string, number>> {
  const conflicts = new Map<string, Map<string, number>>();

  // Initialize matrix
  for (const p1 of players) {
    conflicts.set(p1.id, new Map());
    for (const p2 of players) {
      conflicts.get(p1.id)!.set(p2.id, 0);
    }
  }

  // Count conflicts for each item
  for (const item of items) {
    // Get players who need this item and haven't received it
    const activeNeeders = item.needers
      .filter((n) => !n.hasReceived && n.playerId)
      .map((n) => n.playerId!);

    // For each pair of needers, increment their conflict count
    for (let i = 0; i < activeNeeders.length; i++) {
      for (let j = i + 1; j < activeNeeders.length; j++) {
        const p1 = activeNeeders[i];
        const p2 = activeNeeders[j];

        if (conflicts.has(p1) && conflicts.get(p1)!.has(p2)) {
          conflicts.get(p1)!.set(p2, conflicts.get(p1)!.get(p2)! + 1);
          conflicts.get(p2)!.set(p1, conflicts.get(p2)!.get(p1)! + 1);
        }
      }
    }
  }

  return conflicts;
}

// Calculate total conflicts a player has with all assigned players in a group
function calculateGroupConflicts(
  playerId: string,
  group: Player[],
  conflicts: Map<string, Map<string, number>>
): number {
  let total = 0;
  for (const member of group) {
    total += conflicts.get(playerId)?.get(member.id) || 0;
  }
  return total;
}

// Count players by role category in a group
function countRoles(group: Player[]): Record<string, number> {
  const counts: Record<string, number> = {
    Tank: 0,
    Healer: 0,
    MeleeDPS: 0,
    RangedDPS: 0,
  };

  for (const player of group) {
    const role = getRoleCategory(player);
    counts[role]++;
  }

  return counts;
}

// Check if a group has space for a player's role
function hasRoleSpace(group: Player[], player: Player): boolean {
  const role = getRoleCategory(player);
  const counts = countRoles(group);
  return counts[role] < ROLE_LIMITS[role];
}

// Main auto-sort function
export function autoSortByLootNeeds(
  players: Player[],
  items: KarazhanItem[],
  numGroups: number = 3
): { groups: Player[][]; conflictScores: number[] } {
  // Build conflict matrix
  const conflicts = buildConflictMatrix(players, items);

  // Calculate total conflicts for each player
  const playerConflicts = new Map<string, number>();
  for (const player of players) {
    let total = 0;
    for (const other of players) {
      if (player.id !== other.id) {
        total += conflicts.get(player.id)?.get(other.id) || 0;
      }
    }
    playerConflicts.set(player.id, total);
  }

  // Sort players by total conflicts (descending) - hardest to place first
  const sortedPlayers = [...players].sort(
    (a, b) => (playerConflicts.get(b.id) || 0) - (playerConflicts.get(a.id) || 0)
  );

  // Initialize empty groups
  const groups: Player[][] = Array.from({ length: numGroups }, () => []);

  // Greedy assignment
  for (const player of sortedPlayers) {
    let bestGroupIdx = -1;
    let bestConflictScore = Infinity;

    // Find the group with least conflicts that has role space
    for (let i = 0; i < numGroups; i++) {
      if (hasRoleSpace(groups[i], player)) {
        const conflictScore = calculateGroupConflicts(player.id, groups[i], conflicts);
        if (conflictScore < bestConflictScore) {
          bestConflictScore = conflictScore;
          bestGroupIdx = i;
        }
      }
    }

    // If no group has role space, find any group with space (group size < 10)
    if (bestGroupIdx === -1) {
      for (let i = 0; i < numGroups; i++) {
        if (groups[i].length < 10) {
          const conflictScore = calculateGroupConflicts(player.id, groups[i], conflicts);
          if (conflictScore < bestConflictScore) {
            bestConflictScore = conflictScore;
            bestGroupIdx = i;
          }
        }
      }
    }

    // Assign to best group (or first available if still -1)
    if (bestGroupIdx === -1) {
      bestGroupIdx = groups.findIndex((g) => g.length < 10);
    }

    if (bestGroupIdx !== -1) {
      groups[bestGroupIdx].push(player);
    }
  }

  // Calculate final conflict scores for each group
  const conflictScores = groups.map((group) => {
    let score = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        score += conflicts.get(group[i].id)?.get(group[j].id) || 0;
      }
    }
    return score;
  });

  return { groups, conflictScores };
}

// Get role composition summary for a group
export function getRoleComposition(group: Player[]): string {
  const counts = countRoles(group);
  return `${counts.Tank}T / ${counts.Healer}H / ${counts.MeleeDPS}M / ${counts.RangedDPS}R`;
}

// Export types for use in components
export type { Player as LootOptimizerPlayer, KarazhanItem as LootOptimizerItem };
