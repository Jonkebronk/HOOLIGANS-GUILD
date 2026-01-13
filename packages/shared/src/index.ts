// TBC Types for gear picker
export * from './tbc-types';

// WoW Class Colors
export const CLASS_COLORS: Record<string, string> = {
  Druid: '#FF7C0A',
  Hunter: '#AAD372',
  Mage: '#3FC7EB',
  Paladin: '#F48CBA',
  Priest: '#FFFFFF',
  Rogue: '#FFF468',
  Shaman: '#0070DD',
  Warlock: '#8788EE',
  Warrior: '#C69B6D',
};

// Class Specs
export const CLASS_SPECS: Record<string, string[]> = {
  Druid: ['DruidBalance', 'DruidRestoration', 'DruidDreamstate', 'DruidFeral', 'DruidGuardian'],
  Hunter: ['HunterMarksmanship', 'HunterSurvival', 'HunterBeastMastery'],
  Mage: ['MageArcane', 'MageFire', 'MageFrost'],
  Paladin: ['PaladinProtection', 'PaladinHoly', 'PaladinRetribution'],
  Priest: ['PriestShadow', 'PriestDiscipline', 'PriestHoly'],
  Rogue: ['RogueAssassination', 'RogueSubtlety', 'RogueCombat'],
  Shaman: ['ShamanElemental', 'ShamanRestoration', 'ShamanEnhancement'],
  Warlock: ['WarlockDemonology', 'WarlockAffliction', 'WarlockDestruction'],
  Warrior: ['WarriorFury', 'WarriorProtection', 'WarriorArms', 'WarriorKebab'],
};

// Spec to Role mapping
export const SPEC_ROLES: Record<string, { role: string; subtype: string }> = {
  // Tanks
  DruidGuardian: { role: 'Tank', subtype: 'Tank' },
  PaladinProtection: { role: 'Tank', subtype: 'Tank' },
  WarriorProtection: { role: 'Tank', subtype: 'Tank' },
  DruidFeral: { role: 'Tank', subtype: 'Tank' }, // Can also DPS

  // Healers
  DruidRestoration: { role: 'Heal', subtype: 'Heal' },
  DruidDreamstate: { role: 'Heal', subtype: 'Heal' },
  PaladinHoly: { role: 'Heal', subtype: 'Heal' },
  PriestDiscipline: { role: 'Heal', subtype: 'Heal' },
  PriestHoly: { role: 'Heal', subtype: 'Heal' },
  ShamanRestoration: { role: 'Heal', subtype: 'Heal' },

  // Melee DPS
  RogueAssassination: { role: 'DPS', subtype: 'DPS_Melee' },
  RogueSubtlety: { role: 'DPS', subtype: 'DPS_Melee' },
  RogueCombat: { role: 'DPS', subtype: 'DPS_Melee' },
  WarriorFury: { role: 'DPS', subtype: 'DPS_Melee' },
  WarriorArms: { role: 'DPS', subtype: 'DPS_Melee' },
  WarriorKebab: { role: 'DPS', subtype: 'DPS_Melee' },  // Same as Arms
  ShamanEnhancement: { role: 'DPS', subtype: 'DPS_Melee' },
  PaladinRetribution: { role: 'DPS', subtype: 'DPS_Melee' },

  // Ranged Physical DPS
  HunterMarksmanship: { role: 'DPS', subtype: 'DPS_Ranged' },
  HunterSurvival: { role: 'DPS', subtype: 'DPS_Ranged' },
  HunterBeastMastery: { role: 'DPS', subtype: 'DPS_Ranged' },

  // Caster DPS
  DruidBalance: { role: 'DPS', subtype: 'DPS_Caster' },
  MageArcane: { role: 'DPS', subtype: 'DPS_Caster' },
  MageFire: { role: 'DPS', subtype: 'DPS_Caster' },
  MageFrost: { role: 'DPS', subtype: 'DPS_Caster' },
  PriestShadow: { role: 'DPS', subtype: 'DPS_Caster' },
  ShamanElemental: { role: 'DPS', subtype: 'DPS_Caster' },
  WarlockAffliction: { role: 'DPS', subtype: 'DPS_Caster' },
  WarlockDemonology: { role: 'DPS', subtype: 'DPS_Caster' },
  WarlockDestruction: { role: 'DPS', subtype: 'DPS_Caster' },
};

// Loot Points by Response Type
export const LOOT_POINTS: Record<string, number> = {
  BiS: 200,
  GreaterUpgrade: 100,
  MinorUpgrade: 50,
  Offspec: 25,
  PvP: 25,
  Disenchant: 0,
};

// TBC Raids
export const RAIDS = [
  { name: 'Karazhan', phase: 'P1', shortName: 'Kara' },
  { name: "Gruul's Lair", phase: 'P1', shortName: 'Gruul' },
  { name: "Magtheridon's Lair", phase: 'P1', shortName: 'Mag' },
  { name: 'Serpentshrine Cavern', phase: 'P2', shortName: 'SSC' },
  { name: 'Tempest Keep', phase: 'P2', shortName: 'TK' },
  { name: 'Mount Hyjal', phase: 'P3', shortName: 'Hyjal' },
  { name: 'Black Temple', phase: 'P3', shortName: 'BT' },
  { name: "Zul'Aman", phase: 'P4', shortName: 'ZA' },
  { name: 'Sunwell Plateau', phase: 'P5', shortName: 'SWP' },
];

// Token Types for Tier Sets
// T4/T5 use Fallen Defender/Hero/Champion
// T6 uses Forgotten Conqueror/Protector/Vanquisher (different class assignments!)
export const TOKEN_TYPES: Record<string, string[]> = {
  // T4 and T5 tokens
  'Fallen Defender': ['Druid', 'Priest', 'Warrior'],
  'Fallen Hero': ['Hunter', 'Mage', 'Warlock'],
  'Fallen Champion': ['Paladin', 'Rogue', 'Shaman'],
  // T6 tokens (different class assignments!)
  'Forgotten Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Forgotten Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Forgotten Vanquisher': ['Druid', 'Mage', 'Rogue'],
};

// Gear Slots for Items - simplified slots (not BiS character slots)
// Items use: Finger (not Finger1/2), Trinket (not Trinket1/2)
export const GEAR_SLOTS = [
  'Head', 'Neck', 'Shoulder', 'Back', 'Chest',
  'Wrist', 'Hands', 'Waist', 'Legs', 'Feet',
  'Finger', 'Trinket',
  'MainHand', 'TwoHand', 'OneHand', 'OffHand', 'Ranged'
] as const;

// Item Source Types
export const ITEM_SOURCES = [
  'Raid',
  'Dungeon',
  'Heroic',
  'Vendor',
  'Quest',
  'Crafted',
  'Badge of Justice',
  'World Drop',
  'Reputation',
] as const;

// Format spec name for display
export function formatSpecName(spec: string): string {
  // DruidBalance -> Balance Druid
  const match = spec.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
  if (match) {
    return `${match[2]} ${match[1]}`;
  }
  return spec;
}

// Get class from spec
export function getClassFromSpec(spec: string): string | null {
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    if (specs.includes(spec)) {
      return className;
    }
  }
  return null;
}
