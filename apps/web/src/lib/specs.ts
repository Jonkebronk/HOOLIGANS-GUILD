// TBC Class and Spec definitions

export type WowClass =
  | 'Druid'
  | 'Hunter'
  | 'Mage'
  | 'Paladin'
  | 'Priest'
  | 'Rogue'
  | 'Shaman'
  | 'Warlock'
  | 'Warrior';

export type Spec = {
  id: string;       // e.g., "DruidBalance"
  name: string;     // e.g., "Balance"
  class: WowClass;
  role: 'Tank' | 'Healer' | 'Melee DPS' | 'Ranged DPS';
};

export type ClassDefinition = {
  name: WowClass;
  color: string;
  specs: Spec[];
};

// All TBC specs organized by class
export const CLASS_SPECS: ClassDefinition[] = [
  {
    name: 'Druid',
    color: '#FF7C0A',
    specs: [
      { id: 'DruidBalance', name: 'Balance', class: 'Druid', role: 'Ranged DPS' },
      { id: 'DruidFeral', name: 'Feral', class: 'Druid', role: 'Melee DPS' },
      { id: 'DruidGuardian', name: 'Guardian', class: 'Druid', role: 'Tank' },
      { id: 'DruidRestoration', name: 'Restoration', class: 'Druid', role: 'Healer' },
    ],
  },
  {
    name: 'Hunter',
    color: '#AAD372',
    specs: [
      { id: 'HunterBeastMastery', name: 'Beast Mastery', class: 'Hunter', role: 'Ranged DPS' },
      { id: 'HunterMarksmanship', name: 'Marksmanship', class: 'Hunter', role: 'Ranged DPS' },
      { id: 'HunterSurvival', name: 'Survival', class: 'Hunter', role: 'Ranged DPS' },
    ],
  },
  {
    name: 'Mage',
    color: '#3FC7EB',
    specs: [
      { id: 'MageArcane', name: 'Arcane', class: 'Mage', role: 'Ranged DPS' },
      { id: 'MageFire', name: 'Fire', class: 'Mage', role: 'Ranged DPS' },
      { id: 'MageFrost', name: 'Frost', class: 'Mage', role: 'Ranged DPS' },
    ],
  },
  {
    name: 'Paladin',
    color: '#F48CBA',
    specs: [
      { id: 'PaladinHoly', name: 'Holy', class: 'Paladin', role: 'Healer' },
      { id: 'PaladinProtection', name: 'Protection', class: 'Paladin', role: 'Tank' },
      { id: 'PaladinRetribution', name: 'Retribution', class: 'Paladin', role: 'Melee DPS' },
    ],
  },
  {
    name: 'Priest',
    color: '#FFFFFF',
    specs: [
      { id: 'PriestDiscipline', name: 'Discipline', class: 'Priest', role: 'Healer' },
      { id: 'PriestHoly', name: 'Holy', class: 'Priest', role: 'Healer' },
      { id: 'PriestShadow', name: 'Shadow', class: 'Priest', role: 'Ranged DPS' },
    ],
  },
  {
    name: 'Rogue',
    color: '#FFF468',
    specs: [
      { id: 'RogueAssassination', name: 'Assassination', class: 'Rogue', role: 'Melee DPS' },
      { id: 'RogueCombat', name: 'Combat', class: 'Rogue', role: 'Melee DPS' },
      { id: 'RogueSubtlety', name: 'Subtlety', class: 'Rogue', role: 'Melee DPS' },
    ],
  },
  {
    name: 'Shaman',
    color: '#0070DD',
    specs: [
      { id: 'ShamanElemental', name: 'Elemental', class: 'Shaman', role: 'Ranged DPS' },
      { id: 'ShamanEnhancement', name: 'Enhancement', class: 'Shaman', role: 'Melee DPS' },
      { id: 'ShamanRestoration', name: 'Restoration', class: 'Shaman', role: 'Healer' },
    ],
  },
  {
    name: 'Warlock',
    color: '#8788EE',
    specs: [
      { id: 'WarlockAffliction', name: 'Affliction', class: 'Warlock', role: 'Ranged DPS' },
      { id: 'WarlockDemonology', name: 'Demonology', class: 'Warlock', role: 'Ranged DPS' },
      { id: 'WarlockDestruction', name: 'Destruction', class: 'Warlock', role: 'Ranged DPS' },
    ],
  },
  {
    name: 'Warrior',
    color: '#C69B6D',
    specs: [
      { id: 'WarriorArms', name: 'Arms', class: 'Warrior', role: 'Melee DPS' },
      { id: 'WarriorFury', name: 'Fury', class: 'Warrior', role: 'Melee DPS' },
      { id: 'WarriorProtection', name: 'Protection', class: 'Warrior', role: 'Tank' },
    ],
  },
];

// Flat list of all specs for easy lookup
export const ALL_SPECS: Spec[] = CLASS_SPECS.flatMap(c => c.specs);

// Lookup functions
export function getSpecById(specId: string): Spec | undefined {
  return ALL_SPECS.find(s => s.id === specId);
}

export function getClassByName(className: WowClass): ClassDefinition | undefined {
  return CLASS_SPECS.find(c => c.name === className);
}

export function getSpecsForClass(className: WowClass): Spec[] {
  return CLASS_SPECS.find(c => c.name === className)?.specs || [];
}

// Get class color
export function getClassColor(className: WowClass): string {
  return CLASS_SPECS.find(c => c.name === className)?.color || '#888888';
}

// Get spec display name with class
export function getSpecDisplayName(specId: string): string {
  const spec = getSpecById(specId);
  if (!spec) return specId;
  return `${spec.name} ${spec.class}`;
}

// Short names for loot council display (compact)
export const SPEC_SHORT_NAMES: Record<string, string> = {
  'DruidBalance': 'Balance',
  'DruidFeral': 'Feral',
  'DruidGuardian': 'Guardian',
  'DruidRestoration': 'Resto Druid',
  'HunterBeastMastery': 'BM',
  'HunterMarksmanship': 'MM',
  'HunterSurvival': 'Surv',
  'MageArcane': 'Arcane',
  'MageFire': 'Fire',
  'MageFrost': 'Frost',
  'PaladinHoly': 'Holy Pala',
  'PaladinProtection': 'Prot Pala',
  'PaladinRetribution': 'Retri',
  'PriestDiscipline': 'Disc',
  'PriestHoly': 'Holy Priest',
  'PriestShadow': 'Shadow',
  'RogueAssassination': 'Assassin',
  'RogueCombat': 'Combat',
  'RogueSubtlety': 'Sub',
  'ShamanElemental': 'Ele',
  'ShamanEnhancement': 'Enh',
  'ShamanRestoration': 'Resto Sham',
  'WarlockAffliction': 'Affli',
  'WarlockDemonology': 'Demo',
  'WarlockDestruction': 'Destro',
  'WarriorArms': 'Arms',
  'WarriorFury': 'Fury',
  'WarriorProtection': 'Prot War',
};

// Get short name for a spec (for loot council display)
export function getSpecShortName(specId: string): string {
  return SPEC_SHORT_NAMES[specId] || getSpecById(specId)?.name || specId;
}

// Map spec short names to their class (for coloring)
export const SPEC_SHORT_NAME_TO_CLASS: Record<string, WowClass> = {
  'Balance': 'Druid',
  'Feral': 'Druid',
  'Guardian': 'Druid',
  'Resto Druid': 'Druid',
  'BM': 'Hunter',
  'MM': 'Hunter',
  'Surv': 'Hunter',
  'Arcane': 'Mage',
  'Fire': 'Mage',
  'Frost': 'Mage',
  'Holy Pala': 'Paladin',
  'Prot Pala': 'Paladin',
  'Retri': 'Paladin',
  'Disc': 'Priest',
  'Holy Priest': 'Priest',
  'Shadow': 'Priest',
  'Assassin': 'Rogue',
  'Combat': 'Rogue',
  'Sub': 'Rogue',
  'Ele': 'Shaman',
  'Enh': 'Shaman',
  'Resto Sham': 'Shaman',
  'Affli': 'Warlock',
  'Demo': 'Warlock',
  'Destro': 'Warlock',
  'Arms': 'Warrior',
  'Fury': 'Warrior',
  'Prot War': 'Warrior',
};

// Get class color for a spec short name
export function getSpecShortNameColor(shortName: string): string {
  const wowClass = SPEC_SHORT_NAME_TO_CLASS[shortName];
  return wowClass ? getClassColor(wowClass) : '#888888';
}
