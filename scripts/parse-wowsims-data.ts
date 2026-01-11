/**
 * WoWSims TBC Data Parser
 *
 * Converts Go-formatted item/enchant/gem data from WoWSims TBC repo
 * into JSON files for use in the gear picker modal.
 *
 * Usage: npx ts-node scripts/parse-wowsims-data.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Type definitions
interface TbcItem {
  id: number;
  name: string;
  slot: string;
  armorType?: string;
  phase: number;
  quality: string;
  ilvl?: number;
  stats: Record<string, number>;
  gemSockets?: string[];
  socketBonus?: Record<string, number>;
  setName?: string;
  unique?: boolean;
  classAllowlist?: string[];
  // Weapon fields
  weaponType?: string;
  handType?: string;
  rangedWeaponType?: string;
  weaponDamageMin?: number;
  weaponDamageMax?: number;
  swingSpeed?: number;
}

interface TbcEnchant {
  id: number;
  effectId?: number;
  name: string;
  slot: string;
  phase: number;
  quality: string;
  stats: Record<string, number>;
  enchantType?: string;
  classAllowlist?: string[];
}

interface TbcGem {
  id: number;
  name: string;
  color: string;
  phase: number;
  quality: string;
  stats: Record<string, number>;
  unique?: boolean;
}

// Mapping proto enums to readable strings
const itemTypeMap: Record<string, string> = {
  'proto.ItemType_ItemTypeHead': 'Head',
  'proto.ItemType_ItemTypeNeck': 'Neck',
  'proto.ItemType_ItemTypeShoulder': 'Shoulder',
  'proto.ItemType_ItemTypeBack': 'Back',
  'proto.ItemType_ItemTypeChest': 'Chest',
  'proto.ItemType_ItemTypeWrist': 'Wrist',
  'proto.ItemType_ItemTypeHands': 'Hands',
  'proto.ItemType_ItemTypeWaist': 'Waist',
  'proto.ItemType_ItemTypeLegs': 'Legs',
  'proto.ItemType_ItemTypeFeet': 'Feet',
  'proto.ItemType_ItemTypeFinger': 'Finger',
  'proto.ItemType_ItemTypeTrinket': 'Trinket',
  'proto.ItemType_ItemTypeWeapon': 'Weapon',
  'proto.ItemType_ItemTypeRanged': 'Ranged',
};

const armorTypeMap: Record<string, string> = {
  'proto.ArmorType_ArmorTypeCloth': 'Cloth',
  'proto.ArmorType_ArmorTypeLeather': 'Leather',
  'proto.ArmorType_ArmorTypeMail': 'Mail',
  'proto.ArmorType_ArmorTypePlate': 'Plate',
};

const qualityMap: Record<string, string> = {
  'proto.ItemQuality_ItemQualityCommon': 'Common',
  'proto.ItemQuality_ItemQualityUncommon': 'Uncommon',
  'proto.ItemQuality_ItemQualityRare': 'Rare',
  'proto.ItemQuality_ItemQualityEpic': 'Epic',
  'proto.ItemQuality_ItemQualityLegendary': 'Legendary',
};

const gemColorMap: Record<string, string> = {
  'proto.GemColor_GemColorRed': 'Red',
  'proto.GemColor_GemColorBlue': 'Blue',
  'proto.GemColor_GemColorYellow': 'Yellow',
  'proto.GemColor_GemColorGreen': 'Green',
  'proto.GemColor_GemColorOrange': 'Orange',
  'proto.GemColor_GemColorPurple': 'Purple',
  'proto.GemColor_GemColorMeta': 'Meta',
  'proto.GemColor_GemColorPrismatic': 'Prismatic',
};

const weaponTypeMap: Record<string, string> = {
  'proto.WeaponType_WeaponTypeAxe': 'Axe',
  'proto.WeaponType_WeaponTypeDagger': 'Dagger',
  'proto.WeaponType_WeaponTypeFist': 'Fist',
  'proto.WeaponType_WeaponTypeMace': 'Mace',
  'proto.WeaponType_WeaponTypeSword': 'Sword',
  'proto.WeaponType_WeaponTypePolearm': 'Polearm',
  'proto.WeaponType_WeaponTypeStaff': 'Staff',
  'proto.WeaponType_WeaponTypeShield': 'Shield',
  'proto.WeaponType_WeaponTypeOffHand': 'OffHand',
};

const handTypeMap: Record<string, string> = {
  'proto.HandType_HandTypeMainHand': 'MainHand',
  'proto.HandType_HandTypeOffHand': 'OffHand',
  'proto.HandType_HandTypeOneHand': 'OneHand',
  'proto.HandType_HandTypeTwoHand': 'TwoHand',
};

const rangedWeaponTypeMap: Record<string, string> = {
  'proto.RangedWeaponType_RangedWeaponTypeBow': 'Bow',
  'proto.RangedWeaponType_RangedWeaponTypeCrossbow': 'Crossbow',
  'proto.RangedWeaponType_RangedWeaponTypeGun': 'Gun',
  'proto.RangedWeaponType_RangedWeaponTypeThrown': 'Thrown',
  'proto.RangedWeaponType_RangedWeaponTypeWand': 'Wand',
};

const classMap: Record<string, string> = {
  'proto.Class_ClassDruid': 'Druid',
  'proto.Class_ClassHunter': 'Hunter',
  'proto.Class_ClassMage': 'Mage',
  'proto.Class_ClassPaladin': 'Paladin',
  'proto.Class_ClassPriest': 'Priest',
  'proto.Class_ClassRogue': 'Rogue',
  'proto.Class_ClassShaman': 'Shaman',
  'proto.Class_ClassWarlock': 'Warlock',
  'proto.Class_ClassWarrior': 'Warrior',
};

const statNameMap: Record<string, string> = {
  'stats.Strength': 'strength',
  'stats.Agility': 'agility',
  'stats.Stamina': 'stamina',
  'stats.Intellect': 'intellect',
  'stats.Spirit': 'spirit',
  'stats.SpellPower': 'spellPower',
  'stats.HealingPower': 'healingPower',
  'stats.SpellCrit': 'spellCrit',
  'stats.SpellHit': 'spellHit',
  'stats.SpellHaste': 'spellHaste',
  'stats.SpellPenetration': 'spellPenetration',
  'stats.AttackPower': 'attackPower',
  'stats.RangedAttackPower': 'rangedAttackPower',
  'stats.MeleeCrit': 'meleeCrit',
  'stats.MeleeHit': 'meleeHit',
  'stats.MeleeHaste': 'meleeHaste',
  'stats.ArmorPenetration': 'armorPenetration',
  'stats.Armor': 'armor',
  'stats.Defense': 'defense',
  'stats.Dodge': 'dodge',
  'stats.Parry': 'parry',
  'stats.Block': 'block',
  'stats.BlockValue': 'blockValue',
  'stats.Resilience': 'resilience',
  'stats.Health': 'health',
  'stats.Mana': 'mana',
  'stats.MP5': 'mp5',
  'stats.ArcaneResistance': 'arcaneResistance',
  'stats.FireResistance': 'fireResistance',
  'stats.FrostResistance': 'frostResistance',
  'stats.NatureResistance': 'natureResistance',
  'stats.ShadowResistance': 'shadowResistance',
  'stats.ArcaneSpellPower': 'arcaneSpellPower',
  'stats.FireSpellPower': 'fireSpellPower',
  'stats.FrostSpellPower': 'frostSpellPower',
  'stats.NatureSpellPower': 'natureSpellPower',
  'stats.ShadowSpellPower': 'shadowSpellPower',
  'stats.HolySpellPower': 'holySpellPower',
  'stats.FeralAttackPower': 'feralAttackPower',
  'stats.Expertise': 'expertise',
};

// Parse stats.Stats{...} format
function parseStats(statsStr: string): Record<string, number> {
  const stats: Record<string, number> = {};

  // Match stats.Stats{...} pattern
  const match = statsStr.match(/stats\.Stats\{([^}]*)\}/);
  if (!match || !match[1].trim()) {
    return stats;
  }

  const content = match[1];
  // Match stat: value pairs
  const statMatches = content.matchAll(/(stats\.\w+):\s*(-?[\d.]+)/g);

  for (const statMatch of statMatches) {
    const statName = statNameMap[statMatch[1]];
    if (statName) {
      stats[statName] = parseFloat(statMatch[2]);
    }
  }

  return stats;
}

// Parse GemSockets array
function parseGemSockets(socketsStr: string): string[] {
  const sockets: string[] = [];

  // Match []proto.GemColor{...} pattern
  const match = socketsStr.match(/\[\]proto\.GemColor\{([^}]*)\}/);
  if (!match) return sockets;

  const content = match[1];
  const gemMatches = content.matchAll(/proto\.GemColor_GemColor(\w+)/g);

  for (const gemMatch of gemMatches) {
    sockets.push(gemMatch[1]);
  }

  return sockets;
}

// Parse ClassAllowlist array
function parseClassAllowlist(classStr: string): string[] {
  const classes: string[] = [];

  // Match []proto.Class{...} pattern
  const match = classStr.match(/\[\]proto\.Class\{([^}]*)\}/);
  if (!match) return classes;

  const content = match[1];
  const classMatches = content.matchAll(/proto\.Class_Class(\w+)/g);

  for (const classMatch of classMatches) {
    classes.push(classMatch[1]);
  }

  return classes;
}

// Extract value for a field from item string
function extractField(itemStr: string, fieldName: string): string | undefined {
  // Handle different patterns based on field type
  if (fieldName === 'Stats' || fieldName === 'SocketBonus' || fieldName === 'Bonus') {
    const regex = new RegExp(`${fieldName}:\\s*stats\\.Stats\\{[^}]*\\}`);
    const match = itemStr.match(regex);
    return match ? match[0] : undefined;
  }

  if (fieldName === 'GemSockets') {
    const regex = /GemSockets:\s*\[\]proto\.GemColor\{[^}]*\}/;
    const match = itemStr.match(regex);
    return match ? match[0] : undefined;
  }

  if (fieldName === 'ClassAllowlist') {
    const regex = /ClassAllowlist:\s*\[\]proto\.Class\{[^}]*\}/;
    const match = itemStr.match(regex);
    return match ? match[0] : undefined;
  }

  // Handle string fields (Name, SetName)
  if (fieldName === 'Name' || fieldName === 'SetName') {
    const regex = new RegExp(`${fieldName}:\\s*"([^"]*)"`);
    const match = itemStr.match(regex);
    return match ? match[1] : undefined;
  }

  // Handle boolean fields
  if (fieldName === 'Unique' || fieldName === 'IsSpellID') {
    const regex = new RegExp(`${fieldName}:\\s*(true|false)`);
    const match = itemStr.match(regex);
    return match ? match[1] : undefined;
  }

  // Handle numeric fields
  const numericFields = ['ID', 'Phase', 'Ilvl', 'WeaponDamageMin', 'WeaponDamageMax', 'SwingSpeed', 'EffectID', 'QualityModifier'];
  if (numericFields.includes(fieldName)) {
    const regex = new RegExp(`${fieldName}:\\s*(-?[\\d.]+)`);
    const match = itemStr.match(regex);
    return match ? match[1] : undefined;
  }

  // Handle proto enum fields
  const protoFields = ['Type', 'ArmorType', 'Quality', 'Color', 'WeaponType', 'HandType', 'RangedWeaponType', 'ItemType', 'EnchantType'];
  if (protoFields.includes(fieldName)) {
    const regex = new RegExp(`${fieldName}:\\s*(proto\\.[\\w_]+)`);
    const match = itemStr.match(regex);
    return match ? match[1] : undefined;
  }

  return undefined;
}

// Parse items from Go file
function parseItems(content: string): TbcItem[] {
  const items: TbcItem[] = [];

  // Find the Items array
  const arrayMatch = content.match(/var Items = \[\]Item\{([\s\S]*)\}/);
  if (!arrayMatch) {
    console.error('Could not find Items array');
    return items;
  }

  // Split into individual item entries
  // Each item starts with {Name: and ends with },
  const itemsContent = arrayMatch[1];
  const itemRegex = /\{Name:[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const itemMatches = itemsContent.match(itemRegex);

  if (!itemMatches) {
    console.error('No items found');
    return items;
  }

  console.log(`Found ${itemMatches.length} items to parse`);

  for (const itemStr of itemMatches) {
    try {
      const name = extractField(itemStr, 'Name');
      const id = extractField(itemStr, 'ID');
      const itemType = extractField(itemStr, 'Type');
      const armorType = extractField(itemStr, 'ArmorType');
      const phase = extractField(itemStr, 'Phase');
      const quality = extractField(itemStr, 'Quality');
      const ilvl = extractField(itemStr, 'Ilvl');
      const statsStr = extractField(itemStr, 'Stats');
      const gemSocketsStr = extractField(itemStr, 'GemSockets');
      const socketBonusStr = extractField(itemStr, 'SocketBonus');
      const setName = extractField(itemStr, 'SetName');
      const unique = extractField(itemStr, 'Unique');
      const classAllowlistStr = extractField(itemStr, 'ClassAllowlist');
      const weaponType = extractField(itemStr, 'WeaponType');
      const handType = extractField(itemStr, 'HandType');
      const rangedWeaponType = extractField(itemStr, 'RangedWeaponType');
      const weaponDamageMin = extractField(itemStr, 'WeaponDamageMin');
      const weaponDamageMax = extractField(itemStr, 'WeaponDamageMax');
      const swingSpeed = extractField(itemStr, 'SwingSpeed');

      if (!name || !id || !itemType) {
        continue;
      }

      const item: TbcItem = {
        id: parseInt(id),
        name,
        slot: itemTypeMap[itemType] || itemType,
        phase: phase ? parseInt(phase) : 1,
        quality: quality ? (qualityMap[quality] || quality) : 'Common',
        stats: statsStr ? parseStats(statsStr) : {},
      };

      if (armorType) {
        item.armorType = armorTypeMap[armorType] || armorType;
      }

      if (ilvl) {
        item.ilvl = parseInt(ilvl);
      }

      if (gemSocketsStr) {
        const sockets = parseGemSockets(gemSocketsStr);
        if (sockets.length > 0) {
          item.gemSockets = sockets;
        }
      }

      if (socketBonusStr) {
        const bonus = parseStats(socketBonusStr);
        if (Object.keys(bonus).length > 0) {
          item.socketBonus = bonus;
        }
      }

      if (setName) {
        item.setName = setName;
      }

      if (unique === 'true') {
        item.unique = true;
      }

      if (classAllowlistStr) {
        const classes = parseClassAllowlist(classAllowlistStr);
        if (classes.length > 0) {
          item.classAllowlist = classes;
        }
      }

      if (weaponType) {
        item.weaponType = weaponTypeMap[weaponType] || weaponType;
      }

      if (handType) {
        item.handType = handTypeMap[handType] || handType;
      }

      if (rangedWeaponType) {
        item.rangedWeaponType = rangedWeaponTypeMap[rangedWeaponType] || rangedWeaponType;
      }

      if (weaponDamageMin) {
        item.weaponDamageMin = parseFloat(weaponDamageMin);
      }

      if (weaponDamageMax) {
        item.weaponDamageMax = parseFloat(weaponDamageMax);
      }

      if (swingSpeed) {
        item.swingSpeed = parseFloat(swingSpeed);
      }

      items.push(item);
    } catch (error) {
      console.error('Error parsing item:', itemStr.substring(0, 100), error);
    }
  }

  return items;
}

// Parse enchants from Go file
function parseEnchants(content: string): TbcEnchant[] {
  const enchants: TbcEnchant[] = [];

  // Find the Enchants array
  const arrayMatch = content.match(/var Enchants = \[\]Enchant\{([\s\S]*)\}/);
  if (!arrayMatch) {
    console.error('Could not find Enchants array');
    return enchants;
  }

  const enchantsContent = arrayMatch[1];
  const enchantRegex = /\{ID:[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const enchantMatches = enchantsContent.match(enchantRegex);

  if (!enchantMatches) {
    console.error('No enchants found');
    return enchants;
  }

  console.log(`Found ${enchantMatches.length} enchants to parse`);

  for (const enchantStr of enchantMatches) {
    try {
      const id = extractField(enchantStr, 'ID');
      const effectId = extractField(enchantStr, 'EffectID');
      const name = extractField(enchantStr, 'Name');
      const itemType = extractField(enchantStr, 'ItemType');
      const phase = extractField(enchantStr, 'Phase');
      const quality = extractField(enchantStr, 'Quality');
      const bonusStr = extractField(enchantStr, 'Bonus');
      const enchantType = extractField(enchantStr, 'EnchantType');
      const classAllowlistStr = extractField(enchantStr, 'ClassAllowlist');

      if (!id || !name || !itemType) {
        continue;
      }

      const enchant: TbcEnchant = {
        id: parseInt(id),
        name,
        slot: itemTypeMap[itemType] || itemType,
        phase: phase ? parseInt(phase) : 1,
        quality: quality ? (qualityMap[quality] || quality) : 'Common',
        stats: bonusStr ? parseStats(bonusStr) : {},
      };

      if (effectId) {
        enchant.effectId = parseInt(effectId);
      }

      if (enchantType) {
        const typeMatch = enchantType.match(/proto\.EnchantType_EnchantType(\w+)/);
        if (typeMatch) {
          enchant.enchantType = typeMatch[1];
        }
      }

      if (classAllowlistStr) {
        const classes = parseClassAllowlist(classAllowlistStr);
        if (classes.length > 0) {
          enchant.classAllowlist = classes;
        }
      }

      enchants.push(enchant);
    } catch (error) {
      console.error('Error parsing enchant:', enchantStr.substring(0, 100), error);
    }
  }

  return enchants;
}

// Parse gems from Go file
function parseGems(content: string): TbcGem[] {
  const gems: TbcGem[] = [];

  // Find the Gems array
  const arrayMatch = content.match(/var Gems = \[\]Gem\{([\s\S]*)\}/);
  if (!arrayMatch) {
    console.error('Could not find Gems array');
    return gems;
  }

  const gemsContent = arrayMatch[1];
  const gemRegex = /\{Name:[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const gemMatches = gemsContent.match(gemRegex);

  if (!gemMatches) {
    console.error('No gems found');
    return gems;
  }

  console.log(`Found ${gemMatches.length} gems to parse`);

  for (const gemStr of gemMatches) {
    try {
      const name = extractField(gemStr, 'Name');
      const id = extractField(gemStr, 'ID');
      const color = extractField(gemStr, 'Color');
      const phase = extractField(gemStr, 'Phase');
      const quality = extractField(gemStr, 'Quality');
      const statsStr = extractField(gemStr, 'Stats');
      const unique = extractField(gemStr, 'Unique');

      if (!name || !id || !color) {
        continue;
      }

      const gem: TbcGem = {
        id: parseInt(id),
        name,
        color: gemColorMap[color] || color,
        phase: phase ? parseInt(phase) : 1,
        quality: quality ? (qualityMap[quality] || quality) : 'Common',
        stats: statsStr ? parseStats(statsStr) : {},
      };

      if (unique === 'true') {
        gem.unique = true;
      }

      gems.push(gem);
    } catch (error) {
      console.error('Error parsing gem:', gemStr.substring(0, 100), error);
    }
  }

  return gems;
}

// Main execution
async function main() {
  const scriptsDir = __dirname;
  const wowsimsDataDir = path.join(scriptsDir, 'wowsims-data');
  const outputDir = path.join(scriptsDir, '..', 'packages', 'shared', 'src', 'data');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Parsing WoWSims TBC data...\n');

  // Parse items
  console.log('=== Parsing Items ===');
  const itemsContent = fs.readFileSync(path.join(wowsimsDataDir, 'all_items.go'), 'utf-8');
  const items = parseItems(itemsContent);
  console.log(`Parsed ${items.length} items\n`);

  // Parse enchants
  console.log('=== Parsing Enchants ===');
  const enchantsContent = fs.readFileSync(path.join(wowsimsDataDir, 'all_enchants.go'), 'utf-8');
  const enchants = parseEnchants(enchantsContent);
  console.log(`Parsed ${enchants.length} enchants\n`);

  // Parse gems
  console.log('=== Parsing Gems ===');
  const gemsContent = fs.readFileSync(path.join(wowsimsDataDir, 'all_gems.go'), 'utf-8');
  const gems = parseGems(gemsContent);
  console.log(`Parsed ${gems.length} gems\n`);

  // Write output files
  console.log('=== Writing JSON files ===');

  fs.writeFileSync(
    path.join(outputDir, 'tbc-items.json'),
    JSON.stringify(items, null, 2)
  );
  console.log(`Written ${items.length} items to tbc-items.json`);

  fs.writeFileSync(
    path.join(outputDir, 'tbc-enchants.json'),
    JSON.stringify(enchants, null, 2)
  );
  console.log(`Written ${enchants.length} enchants to tbc-enchants.json`);

  fs.writeFileSync(
    path.join(outputDir, 'tbc-gems.json'),
    JSON.stringify(gems, null, 2)
  );
  console.log(`Written ${gems.length} gems to tbc-gems.json`);

  // Print some stats
  console.log('\n=== Summary ===');
  console.log(`Total items: ${items.length}`);
  console.log(`Total enchants: ${enchants.length}`);
  console.log(`Total gems: ${gems.length}`);

  // Phase breakdown
  const itemsByPhase: Record<number, number> = {};
  for (const item of items) {
    itemsByPhase[item.phase] = (itemsByPhase[item.phase] || 0) + 1;
  }
  console.log('\nItems by phase:');
  for (const [phase, count] of Object.entries(itemsByPhase).sort()) {
    console.log(`  Phase ${phase}: ${count} items`);
  }

  const gemsByColor: Record<string, number> = {};
  for (const gem of gems) {
    gemsByColor[gem.color] = (gemsByColor[gem.color] || 0) + 1;
  }
  console.log('\nGems by color:');
  for (const [color, count] of Object.entries(gemsByColor).sort()) {
    console.log(`  ${color}: ${count} gems`);
  }
}

main().catch(console.error);
