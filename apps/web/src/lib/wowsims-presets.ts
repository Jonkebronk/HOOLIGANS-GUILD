// WoWSims TBC Preset Fetcher
// Fetches BiS presets from WoWSims GitHub repository

// Mapping from our spec names to WoWSims directory/file structure
const SPEC_TO_WOWSIMS: Record<string, { classDir: string; specFile: string }> = {
  // Druid
  DruidBalance: { classDir: 'balance_druid', specFile: 'balance' },
  DruidFeral: { classDir: 'feral_druid', specFile: 'feral' },
  DruidGuardian: { classDir: 'feral_tank_druid', specFile: 'feral' },
  DruidRestoration: { classDir: 'balance_druid', specFile: 'balance' }, // No resto sim
  DruidDreamstate: { classDir: 'balance_druid', specFile: 'balance' }, // Same as Resto (no sim)

  // Hunter
  HunterBeastMastery: { classDir: 'hunter', specFile: 'bm' },
  HunterMarksmanship: { classDir: 'hunter', specFile: 'mm' },
  HunterSurvival: { classDir: 'hunter', specFile: 'sv' },

  // Mage
  MageArcane: { classDir: 'mage', specFile: 'arcane' },
  MageFire: { classDir: 'mage', specFile: 'fire' },
  MageFrost: { classDir: 'mage', specFile: 'frost' },

  // Paladin
  PaladinHoly: { classDir: 'retribution_paladin', specFile: 'retribution' }, // No holy sim
  PaladinProtection: { classDir: 'protection_paladin', specFile: 'p1' }, // Uses p1, p2, etc format
  PaladinRetribution: { classDir: 'retribution_paladin', specFile: 'retribution' },

  // Priest
  PriestDiscipline: { classDir: 'smite_priest', specFile: 'smite' },
  PriestHoly: { classDir: 'smite_priest', specFile: 'smite' },
  PriestShadow: { classDir: 'shadow_priest', specFile: 'shadow' },

  // Rogue
  RogueAssassination: { classDir: 'rogue', specFile: 'assassination' },
  RogueCombat: { classDir: 'rogue', specFile: 'combat' },
  RogueSubtlety: { classDir: 'rogue', specFile: 'combat' }, // Use combat as fallback

  // Shaman
  ShamanElemental: { classDir: 'elemental_shaman', specFile: 'elemental' },
  ShamanEnhancement: { classDir: 'enhancement_shaman', specFile: 'enhancement' },
  ShamanRestoration: { classDir: 'elemental_shaman', specFile: 'elemental' }, // No resto sim

  // Warlock
  WarlockAffliction: { classDir: 'warlock', specFile: 'aff' },
  WarlockDemonology: { classDir: 'warlock', specFile: 'demo' },
  WarlockDestruction: { classDir: 'warlock', specFile: 'destro' },

  // Warrior
  WarriorArms: { classDir: 'warrior', specFile: 'arms' },
  WarriorKebab: { classDir: 'warrior', specFile: 'arms' },  // Same as Arms
  WarriorFury: { classDir: 'warrior', specFile: 'fury' },
  WarriorProtection: { classDir: 'protection_warrior', specFile: 'prot' },
};

// Slot order in WoWSims preset files (17 slots total)
const WOWSIMS_SLOT_ORDER = [
  'Head',
  'Neck',
  'Shoulder',
  'Back',
  'Chest',
  'Wrist',
  'Hands',
  'Waist',
  'Legs',
  'Feet',
  'Finger1',
  'Finger2',
  'Trinket1',
  'Trinket2',
  'MainHand',
  'OffHand',
  'Ranged',
];

export interface WowSimsPresetItem {
  slot: string;
  wowheadId: number;
  enchantId: number | null;
  gems: number[];
}

export interface WowSimsPresetResult {
  items: WowSimsPresetItem[];
  source: string;
}

/**
 * Fetch a BiS preset from WoWSims GitHub repository
 * @param spec - Our spec name (e.g., "HunterBeastMastery")
 * @param phase - Phase number (1-5)
 * @returns Parsed preset items or null if not found
 */
export async function fetchWowSimsPreset(
  spec: string,
  phase: number
): Promise<WowSimsPresetResult | null> {
  const mapping = SPEC_TO_WOWSIMS[spec];
  if (!mapping) {
    console.warn(`No WoWSims mapping for spec: ${spec}`);
    return null;
  }

  // Try multiple URL patterns as WoWSims uses different naming conventions
  const urlPatterns = [
    // Pattern 1: p{phase}_{spec}.gear.json (most common)
    `https://raw.githubusercontent.com/wowsims/tbc/master/ui/${mapping.classDir}/gear_sets/p${phase}_${mapping.specFile}.gear.json`,
    // Pattern 2: {spec}_p{phase}.gear.json
    `https://raw.githubusercontent.com/wowsims/tbc/master/ui/${mapping.classDir}/gear_sets/${mapping.specFile}_p${phase}.gear.json`,
    // Pattern 3: phase{phase}_{spec}.gear.json
    `https://raw.githubusercontent.com/wowsims/tbc/master/ui/${mapping.classDir}/gear_sets/phase${phase}_${mapping.specFile}.gear.json`,
  ];

  for (const url of urlPatterns) {
    try {
      const res = await fetch(url, {
        cache: 'no-store', // Don't cache to get latest presets
      });

      if (res.ok) {
        const data = await res.json();
        return {
          items: parsePreset(data),
          source: `WoWSims P${phase} ${mapping.specFile}`,
        };
      }
    } catch (error) {
      // Try next pattern
      continue;
    }
  }

  console.warn(`No WoWSims preset found for ${spec} P${phase}`);
  return null;
}

/**
 * Parse WoWSims preset JSON format into our format
 */
function parsePreset(data: {
  items: Array<{ id: number; enchant?: number; gems?: number[] }>;
}): WowSimsPresetItem[] {
  if (!data.items || !Array.isArray(data.items)) {
    return [];
  }

  return data.items.map((item, index) => ({
    slot: WOWSIMS_SLOT_ORDER[index] || `Unknown${index}`,
    wowheadId: item.id,
    enchantId: item.enchant || null,
    gems: item.gems || [],
  }));
}

/**
 * Get available specs that have WoWSims presets
 */
export function getSpecsWithPresets(): string[] {
  return Object.keys(SPEC_TO_WOWSIMS);
}

/**
 * Check if a spec has WoWSims preset support
 */
export function hasWowSimsPreset(spec: string): boolean {
  return spec in SPEC_TO_WOWSIMS;
}
