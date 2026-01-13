// WoW LFG role icon URLs
export const ROLE_ICON_URLS = {
  tank: 'https://wow.zamimg.com/images/wow/icons/medium/ui-lfg-roleicon-tank.jpg',
  healer: 'https://wow.zamimg.com/images/wow/icons/medium/ui-lfg-roleicon-healer.jpg',
  melee: 'https://wow.zamimg.com/images/wow/icons/medium/ui-lfg-roleicon-dps.jpg',
  ranged: 'https://wow.zamimg.com/images/wow/icons/medium/ui-lfg-roleicon-dps.jpg',
};

// Consumable roles and specs organization
export const CONSUMABLE_ROLES = {
  tanks: {
    name: 'Tanks',
    icon: 'tank',
    color: '#3b82f6', // blue
    specs: ['DruidGuardian', 'PaladinProtection', 'WarriorProtection'],
  },
  healers: {
    name: 'Healers',
    icon: 'healer',
    color: '#22c55e', // green
    specs: ['DruidRestoration', 'PaladinHoly', 'PriestHoly', 'ShamanRestoration'],
  },
  physicalDps: {
    name: 'Melee DPS',
    icon: 'melee',
    color: '#ef4444', // red
    specs: [
      'DruidFeral',
      'PaladinRetribution',
      'RogueCombat',
      'ShamanEnhancement',
      'WarriorArms',
      'WarriorFury',
    ],
  },
  rangedDps: {
    name: 'Ranged DPS',
    icon: 'ranged',
    color: '#a855f7', // purple
    specs: [
      'HunterBeastMastery',
      'HunterSurvival',
      'DruidBalance',
      'MageArcane',
      'MageFire',
      'PriestShadow',
      'ShamanElemental',
      'WarlockAffliction',
      'WarlockDemonology',
      'WarlockDestruction',
    ],
  },
} as const;

// Consumable categories
export const CONSUMABLE_CATEGORIES = [
  { id: 'flasks', name: 'Flasks and Elixirs' },
  { id: 'food', name: 'Food' },
  { id: 'potions', name: 'Potions' },
  { id: 'weaponBuffs', name: 'Weapon Buffs' },
  { id: 'misc', name: 'Miscellaneous' },
] as const;

// Consumable types for adding new consumables
export const CONSUMABLE_TYPES = [
  { id: 'flask', name: 'Flask' },
  { id: 'elixir', name: 'Elixir' },
  { id: 'food', name: 'Food' },
  { id: 'potion', name: 'Potion' },
  { id: 'weaponBuff', name: 'Weapon Buff' },
  { id: 'misc', name: 'Miscellaneous' },
] as const;

// Map spec IDs to display names
export const SPEC_DISPLAY_NAMES: Record<string, string> = {
  // Druid
  DruidBalance: 'Balance',
  DruidFeral: 'Feral',
  DruidGuardian: 'Guardian',
  DruidRestoration: 'Restoration',
  // Hunter
  HunterBeastMastery: 'Beast Mastery',
  HunterMarksmanship: 'Marksmanship',
  HunterSurvival: 'Survival',
  // Mage
  MageArcane: 'Arcane',
  MageFire: 'Fire',
  MageFrost: 'Frost',
  // Paladin
  PaladinHoly: 'Holy',
  PaladinProtection: 'Protection',
  PaladinRetribution: 'Retribution',
  // Priest
  PriestDiscipline: 'Discipline',
  PriestHoly: 'Holy',
  PriestShadow: 'Shadow',
  // Rogue
  RogueAssassination: 'Assassination',
  RogueCombat: 'Combat',
  RogueSubtlety: 'Subtlety',
  // Shaman
  ShamanElemental: 'Elemental',
  ShamanEnhancement: 'Enhancement',
  ShamanRestoration: 'Restoration',
  // Warlock
  WarlockAffliction: 'Affliction',
  WarlockDemonology: 'Demonology',
  WarlockDestruction: 'Destruction',
  // Warrior
  WarriorArms: 'Arms',
  WarriorFury: 'Fury',
  WarriorProtection: 'Protection',
};

// Extract class from spec ID
export function getClassFromSpec(specId: string): string {
  const classMatch = specId.match(/^(Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior)/);
  return classMatch ? classMatch[1] : 'Unknown';
}

// Get all specs organized by role
export function getSpecsByRole() {
  return Object.entries(CONSUMABLE_ROLES).map(([roleId, role]) => ({
    roleId,
    ...role,
    specs: role.specs.map((spec) => ({
      id: spec,
      name: SPEC_DISPLAY_NAMES[spec] || spec,
      class: getClassFromSpec(spec),
    })),
  }));
}

// Types for consumable data
export type ConsumableType = {
  id: string;
  name: string;
  wowheadId: number;
  icon: string | null;
  type: string;
  specConfigs: ConsumableSpecConfigType[];
};

export type ConsumableSpecConfigType = {
  id: string;
  consumableId: string;
  spec: string;
  category: string;
  priority: 'best' | 'alternative';
  sortOrder: number;
};

// Helper to get consumables for a specific spec and category
export function getConsumablesForSpecCategory(
  consumables: ConsumableType[],
  spec: string,
  category: string,
  priority: 'best' | 'alternative'
): ConsumableType[] {
  return consumables.filter((c) =>
    c.specConfigs.some(
      (sc) => sc.spec === spec && sc.category === category && sc.priority === priority
    )
  );
}

// Helper to check if a consumable is assigned to any spec
export function isConsumableAssigned(consumable: ConsumableType): boolean {
  return consumable.specConfigs.length > 0;
}
