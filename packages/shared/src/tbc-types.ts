// TBC Item, Enchant, and Gem Types
// Parsed from WoWSims TBC data

export interface TbcItemStats {
  strength?: number;
  agility?: number;
  stamina?: number;
  intellect?: number;
  spirit?: number;
  spellPower?: number;
  healingPower?: number;
  spellCrit?: number;
  spellHit?: number;
  spellHaste?: number;
  spellPenetration?: number;
  attackPower?: number;
  rangedAttackPower?: number;
  meleeCrit?: number;
  meleeHit?: number;
  meleeHaste?: number;
  armorPenetration?: number;
  armor?: number;
  defense?: number;
  dodge?: number;
  parry?: number;
  block?: number;
  blockValue?: number;
  resilience?: number;
  health?: number;
  mana?: number;
  mp5?: number;
  arcaneResistance?: number;
  fireResistance?: number;
  frostResistance?: number;
  natureResistance?: number;
  shadowResistance?: number;
  arcaneSpellPower?: number;
  fireSpellPower?: number;
  frostSpellPower?: number;
  natureSpellPower?: number;
  shadowSpellPower?: number;
  holySpellPower?: number;
  feralAttackPower?: number;
  expertise?: number;
}

export type TbcGearSlot =
  | 'Head'
  | 'Neck'
  | 'Shoulder'
  | 'Back'
  | 'Chest'
  | 'Wrist'
  | 'Hands'
  | 'Waist'
  | 'Legs'
  | 'Feet'
  | 'Finger'
  | 'Trinket'
  | 'Weapon'
  | 'Ranged';

export type TbcArmorType = 'Cloth' | 'Leather' | 'Mail' | 'Plate';

export type TbcItemQuality = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export type TbcGemColor = 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Orange' | 'Purple' | 'Meta' | 'Prismatic';

export type TbcWeaponType = 'Axe' | 'Dagger' | 'Fist' | 'Mace' | 'Sword' | 'Polearm' | 'Staff' | 'Shield' | 'OffHand';

export type TbcHandType = 'MainHand' | 'OffHand' | 'OneHand' | 'TwoHand';

export type TbcRangedWeaponType = 'Bow' | 'Crossbow' | 'Gun' | 'Thrown' | 'Wand';

export type TbcClass = 'Druid' | 'Hunter' | 'Mage' | 'Paladin' | 'Priest' | 'Rogue' | 'Shaman' | 'Warlock' | 'Warrior';

export interface TbcItem {
  id: number;
  name: string;
  slot: TbcGearSlot;
  armorType?: TbcArmorType;
  phase: number;
  quality: TbcItemQuality;
  ilvl?: number;
  stats: TbcItemStats;
  gemSockets?: string[];
  socketBonus?: TbcItemStats;
  setName?: string;
  unique?: boolean;
  classAllowlist?: TbcClass[];
  // Weapon fields
  weaponType?: TbcWeaponType;
  handType?: TbcHandType;
  rangedWeaponType?: TbcRangedWeaponType;
  weaponDamageMin?: number;
  weaponDamageMax?: number;
  swingSpeed?: number;
}

export interface TbcEnchant {
  id: number;
  effectId?: number;
  name: string;
  slot: TbcGearSlot;
  phase: number;
  quality: TbcItemQuality;
  stats: TbcItemStats;
  enchantType?: string;
  classAllowlist?: TbcClass[];
}

export interface TbcGem {
  id: number;
  name: string;
  color: TbcGemColor;
  phase: number;
  quality: TbcItemQuality;
  stats: TbcItemStats;
  unique?: boolean;
}

// Quality color mapping
export const TBC_QUALITY_COLORS: Record<TbcItemQuality, string> = {
  Common: '#9d9d9d',
  Uncommon: '#1eff00',
  Rare: '#0070dd',
  Epic: '#a335ee',
  Legendary: '#ff8000',
};

// Gem color CSS mapping
export const TBC_GEM_COLORS: Record<TbcGemColor, string> = {
  Red: '#ff4444',
  Blue: '#4444ff',
  Yellow: '#ffff00',
  Green: '#00ff00',
  Orange: '#ff8800',
  Purple: '#aa44ff',
  Meta: '#888888',
  Prismatic: '#ffffff',
};

// Stat display names and order for UI
export const STAT_DISPLAY_NAMES: Record<keyof TbcItemStats, string> = {
  strength: 'Strength',
  agility: 'Agility',
  stamina: 'Stamina',
  intellect: 'Intellect',
  spirit: 'Spirit',
  spellPower: 'Spell Power',
  healingPower: 'Healing Power',
  spellCrit: 'Spell Crit',
  spellHit: 'Spell Hit',
  spellHaste: 'Spell Haste',
  spellPenetration: 'Spell Pen',
  attackPower: 'Attack Power',
  rangedAttackPower: 'Ranged AP',
  meleeCrit: 'Crit',
  meleeHit: 'Hit',
  meleeHaste: 'Haste',
  armorPenetration: 'Armor Pen',
  armor: 'Armor',
  defense: 'Defense',
  dodge: 'Dodge',
  parry: 'Parry',
  block: 'Block',
  blockValue: 'Block Value',
  resilience: 'Resilience',
  health: 'Health',
  mana: 'Mana',
  mp5: 'MP5',
  arcaneResistance: 'Arcane Resist',
  fireResistance: 'Fire Resist',
  frostResistance: 'Frost Resist',
  natureResistance: 'Nature Resist',
  shadowResistance: 'Shadow Resist',
  arcaneSpellPower: 'Arcane Power',
  fireSpellPower: 'Fire Power',
  frostSpellPower: 'Frost Power',
  natureSpellPower: 'Nature Power',
  shadowSpellPower: 'Shadow Power',
  holySpellPower: 'Holy Power',
  feralAttackPower: 'Feral AP',
  expertise: 'Expertise',
};

// Format stats for display
export function formatStats(stats: TbcItemStats): string {
  const parts: string[] = [];
  const priorityStats: (keyof TbcItemStats)[] = [
    'stamina', 'intellect', 'strength', 'agility', 'spirit',
    'spellPower', 'healingPower', 'attackPower',
    'spellCrit', 'meleeCrit', 'spellHit', 'meleeHit',
    'spellHaste', 'meleeHaste', 'mp5',
    'defense', 'dodge', 'parry', 'block',
  ];

  for (const stat of priorityStats) {
    if (stats[stat]) {
      parts.push(`+${stats[stat]} ${STAT_DISPLAY_NAMES[stat]}`);
    }
  }

  // Add remaining stats
  for (const [key, value] of Object.entries(stats)) {
    if (value && !priorityStats.includes(key as keyof TbcItemStats)) {
      parts.push(`+${value} ${STAT_DISPLAY_NAMES[key as keyof TbcItemStats] || key}`);
    }
  }

  return parts.slice(0, 4).join(', ');
}
