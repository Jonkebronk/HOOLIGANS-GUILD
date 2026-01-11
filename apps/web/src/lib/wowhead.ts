// Wowhead integration utilities

declare global {
  interface Window {
    $WowheadPower?: {
      refreshLinks: () => void;
    };
  }
}

// Refresh Wowhead tooltips after DOM changes
export function refreshWowheadTooltips() {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.$WowheadPower?.refreshLinks();
    }, 100);
  }
}

// Get item icon URL from Wowhead/ZamImg CDN
export function getItemIconUrl(iconName: string, size: 'small' | 'medium' | 'large' = 'large') {
  return `https://wow.zamimg.com/images/wow/icons/${size}/${iconName}.jpg`;
}

// Get class icon URL
export function getClassIconUrl(className: string) {
  const classIcons: Record<string, string> = {
    Druid: 'classicon_druid',
    Hunter: 'classicon_hunter',
    Mage: 'classicon_mage',
    Paladin: 'classicon_paladin',
    Priest: 'classicon_priest',
    Rogue: 'classicon_rogue',
    Shaman: 'classicon_shaman',
    Warlock: 'classicon_warlock',
    Warrior: 'classicon_warrior',
  };
  const icon = classIcons[className] || 'inv_misc_questionmark';
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

// Capitalize first letter of each word
function capitalizeClass(className: string): string {
  if (!className) return 'Unknown';
  return className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
}

// Normalize spec names from various formats to our standard format
export function normalizeSpecName(spec: string, playerClass?: string): string {
  if (!spec) return 'Unknown';

  // Capitalize class name if provided
  const normalizedClass = playerClass ? capitalizeClass(playerClass) : undefined;

  // Already in correct format
  if (spec.match(/^(Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior)(Balance|Feral|Guardian|Restoration|BeastMastery|Marksmanship|Survival|Arcane|Fire|Frost|Holy|Protection|Retribution|Discipline|Shadow|Assassination|Combat|Subtlety|Elemental|Enhancement|Affliction|Demonology|Destruction|Arms|Fury)$/)) {
    return spec;
  }

  // Spec name aliases/variations - maps to the proper spec suffix
  const specAliases: Record<string, string> = {
    // Common variations (lowercase)
    'resto': 'Restoration',
    'restro': 'Restoration',
    'restor': 'Restoration',
    'restoration': 'Restoration',
    'bm': 'BeastMastery',
    'beast mastery': 'BeastMastery',
    'beastmastery': 'BeastMastery',
    'mm': 'Marksmanship',
    'marks': 'Marksmanship',
    'marksmanship': 'Marksmanship',
    'sv': 'Survival',
    'surv': 'Survival',
    'survival': 'Survival',
    'ret': 'Retribution',
    'retribution': 'Retribution',
    'prot': 'Protection',
    'protection': 'Protection',
    'disc': 'Discipline',
    'discipline': 'Discipline',
    'shadow': 'Shadow',
    'holy': 'Holy',
    'ele': 'Elemental',
    'elemental': 'Elemental',
    'enh': 'Enhancement',
    'enhance': 'Enhancement',
    'enhancement': 'Enhancement',
    'aff': 'Affliction',
    'affli': 'Affliction',
    'affliction': 'Affliction',
    'demo': 'Demonology',
    'demonology': 'Demonology',
    'destro': 'Destruction',
    'destruction': 'Destruction',
    'cat': 'Feral',
    'bear': 'Guardian',
    'feral': 'Feral',
    'guardian': 'Guardian',
    'balance': 'Balance',
    'boomkin': 'Balance',
    'boomy': 'Balance',
    'moonkin': 'Balance',
    'combat': 'Combat',
    'sub': 'Subtlety',
    'subtlety': 'Subtlety',
    'mut': 'Assassination',
    'assassination': 'Assassination',
    'arms': 'Arms',
    'fury': 'Fury',
    'arcane': 'Arcane',
    'fire': 'Fire',
    'frost': 'Frost',
    // Dreamstate is Balance Druid
    'dreamstate': 'Balance',
  };

  const specLower = spec.toLowerCase().trim();
  const normalizedSpec = specAliases[specLower];

  // If we found a match and have a class, combine them
  if (normalizedSpec && normalizedClass) {
    return `${normalizedClass}${normalizedSpec}`;
  }

  // Try to extract class and spec from combined string (e.g., "DruidRestoration")
  const classNames = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
  for (const cls of classNames) {
    if (spec.includes(cls)) {
      const specPart = spec.replace(cls, '').trim();
      const normalizedPart = specAliases[specPart.toLowerCase()] || specPart;
      return `${cls}${normalizedPart}`;
    }
  }

  // If we have a class but spec wasn't in aliases, try direct combination
  if (normalizedClass) {
    // Check if spec is already properly capitalized (like "Restoration", "BeastMastery")
    const validSpecs = ['Balance', 'Feral', 'Guardian', 'Restoration', 'BeastMastery', 'Marksmanship', 'Survival',
                        'Arcane', 'Fire', 'Frost', 'Holy', 'Protection', 'Retribution', 'Discipline', 'Shadow',
                        'Assassination', 'Combat', 'Subtlety', 'Elemental', 'Enhancement', 'Affliction',
                        'Demonology', 'Destruction', 'Arms', 'Fury'];

    for (const validSpec of validSpecs) {
      if (spec.toLowerCase() === validSpec.toLowerCase()) {
        return `${normalizedClass}${validSpec}`;
      }
    }
  }

  return spec;
}

// Get spec icon URL
export function getSpecIconUrl(spec: string, playerClass?: string) {
  const normalizedSpec = normalizeSpecName(spec, playerClass);

  const specIcons: Record<string, string> = {
    // Druid
    DruidBalance: 'spell_nature_starfall',
    DruidFeral: 'ability_druid_catform',
    DruidGuardian: 'ability_racial_bearform',
    DruidRestoration: 'spell_nature_healingtouch',
    // Hunter
    HunterBeastMastery: 'ability_hunter_beasttaming',
    HunterMarksmanship: 'ability_marksmanship',
    HunterSurvival: 'ability_hunter_swiftstrike',
    // Mage
    MageArcane: 'spell_holy_magicalsentry',
    MageFire: 'spell_fire_firebolt02',
    MageFrost: 'spell_frost_frostbolt02',
    // Paladin
    PaladinHoly: 'spell_holy_holybolt',
    PaladinProtection: 'spell_holy_devotionaura',
    PaladinRetribution: 'spell_holy_auraoflight',
    // Priest
    PriestDiscipline: 'spell_holy_wordfortitude',
    PriestHoly: 'spell_holy_guardianspirit',
    PriestShadow: 'spell_shadow_shadowwordpain',
    // Rogue
    RogueAssassination: 'ability_rogue_eviscerate',
    RogueCombat: 'ability_backstab',
    RogueSubtlety: 'ability_stealth',
    // Shaman
    ShamanElemental: 'spell_nature_lightning',
    ShamanEnhancement: 'spell_nature_lightningshield',
    ShamanRestoration: 'spell_nature_magicimmunity',
    // Warlock
    WarlockAffliction: 'spell_shadow_deathcoil',
    WarlockDemonology: 'spell_shadow_metamorphosis',
    WarlockDestruction: 'spell_shadow_rainoffire',
    // Warrior
    WarriorArms: 'ability_warrior_savageblow',
    WarriorFury: 'ability_warrior_innerrage',
    WarriorProtection: 'ability_warrior_defensivestance',
  };
  const icon = specIcons[normalizedSpec] || 'inv_misc_questionmark';
  return `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
}

// Item quality colors
export const ITEM_QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d', // Poor (gray)
  1: '#ffffff', // Common (white)
  2: '#1eff00', // Uncommon (green)
  3: '#0070dd', // Rare (blue)
  4: '#a335ee', // Epic (purple)
  5: '#ff8000', // Legendary (orange)
  6: '#e6cc80', // Artifact (light gold)
};

// Build Wowhead item link
export function buildWowheadLink(itemId: number, domain: string = 'tbc') {
  return `https://www.wowhead.com/${domain}/item=${itemId}`;
}

// TBC Raid instances for zone import
export const TBC_RAIDS = [
  { id: '3457', name: 'Karazhan', zoneId: 3457, phase: 'P1' },
  { id: '3923', name: "Gruul's Lair", zoneId: 3923, phase: 'P1' },
  { id: '3836', name: "Magtheridon's Lair", zoneId: 3836, phase: 'P1' },
  { id: '3607', name: 'Serpentshrine Cavern', zoneId: 3607, phase: 'P2' },
  { id: '3845', name: 'Tempest Keep', zoneId: 3845, phase: 'P2' },
  { id: '3606', name: 'Mount Hyjal', zoneId: 3606, phase: 'P3' },
  { id: '3959', name: 'Black Temple', zoneId: 3959, phase: 'P3' },
  { id: '3805', name: "Zul'Aman", zoneId: 3805, phase: 'P4' },
  { id: '4075', name: 'Sunwell Plateau', zoneId: 4075, phase: 'P5' },
];

// Gear slot icons
export const SLOT_ICONS: Record<string, string> = {
  Head: 'inv_helmet_01',
  Neck: 'inv_jewelry_necklace_01',
  Shoulder: 'inv_shoulder_01',
  Back: 'inv_misc_cape_01',
  Chest: 'inv_chest_chain',
  Wrist: 'inv_bracer_01',
  Hands: 'inv_gauntlets_01',
  Waist: 'inv_belt_01',
  Legs: 'inv_pants_01',
  Feet: 'inv_boots_01',
  Finger: 'inv_jewelry_ring_01',
  Finger1: 'inv_jewelry_ring_01',
  Finger2: 'inv_jewelry_ring_01',
  Trinket: 'inv_trinket_naxxramas01',
  Trinket1: 'inv_trinket_naxxramas01',
  Trinket2: 'inv_trinket_naxxramas01',
  MainHand: 'inv_sword_01',
  OffHand: 'inv_shield_01',
  TwoHand: 'inv_sword_04',
  Ranged: 'inv_weapon_bow_01',
  Relic: 'inv_relics_idolofferocity',
};
