import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';
import { TOKEN_TYPES } from '@hooligans/shared';

// Icon names for tier tokens (from wowhead)
const TOKEN_ICONS: Record<number, string> = {
  // T4 - Fallen tokens
  29761: 'inv_helmet_24', 29759: 'inv_helmet_24', 29760: 'inv_helmet_24', // Head (Defender, Hero, Champion)
  29764: 'inv_shoulder_22', 29762: 'inv_shoulder_22', 29763: 'inv_shoulder_22', // Shoulder
  29753: 'inv_chest_chain_03', 29754: 'inv_chest_chain_03', 29755: 'inv_chest_chain_03', // Chest
  29758: 'inv_gauntlets_27', 29756: 'inv_gauntlets_27', 29757: 'inv_gauntlets_27', // Hands
  29767: 'inv_pants_plate_17', 29765: 'inv_pants_plate_17', 29766: 'inv_pants_plate_17', // Legs
  // T5 - Vanquished tokens
  30243: 'inv_helmet_24', 30244: 'inv_helmet_24', 30242: 'inv_helmet_24', // Head
  30249: 'inv_shoulder_14', 30250: 'inv_shoulder_14', 30248: 'inv_shoulder_14', // Shoulder
  30237: 'inv_chest_chain_15', 30238: 'inv_chest_chain_15', 30236: 'inv_chest_chain_15', // Chest
  30240: 'inv_gauntlets_25', 30241: 'inv_gauntlets_25', 30239: 'inv_gauntlets_25', // Hands
  30246: 'inv_pants_mail_15', 30247: 'inv_pants_mail_15', 30245: 'inv_pants_mail_15', // Legs
  // T6 - Forgotten tokens (Head, Shoulder, Chest, Hands, Legs from BT/Hyjal)
  31097: 'inv_helmet_30', 31095: 'inv_helmet_30', 31096: 'inv_helmet_30', // Head (Conqueror, Protector, Vanquisher)
  31101: 'inv_shoulder_25', 31102: 'inv_shoulder_25', 31103: 'inv_shoulder_25', // Shoulder
  31089: 'inv_chest_plate04', 31090: 'inv_chest_plate04', 31091: 'inv_chest_plate04', // Chest
  31092: 'inv_gauntlets_26', 31093: 'inv_gauntlets_26', 31094: 'inv_gauntlets_26', // Hands
  31098: 'inv_pants_plate_12', 31099: 'inv_pants_plate_12', 31100: 'inv_pants_plate_12', // Legs
  // T6 - Forgotten tokens (Wrist, Waist, Feet from Sunwell)
  34848: 'inv_bracer_02', 34851: 'inv_bracer_02', 34852: 'inv_bracer_02', // Wrist
  34853: 'inv_belt_13', 34854: 'inv_belt_13', 34855: 'inv_belt_13', // Waist
  34856: 'inv_boots_chain_01', 34857: 'inv_boots_chain_01', 34858: 'inv_boots_chain_01', // Feet
};

// TBC Tier Token Data
const TIER_TOKENS = {
  T4: {
    phase: 'P1',
    tokens: [
      { slot: 'Head', namePattern: 'Helm of the Fallen', boss: 'Prince Malchezaar', raid: 'Karazhan', wowheadIds: { 'Fallen Defender': 29761, 'Fallen Hero': 29759, 'Fallen Champion': 29760 } },
      { slot: 'Shoulder', namePattern: 'Pauldrons of the Fallen', boss: 'High King Maulgar', raid: "Gruul's Lair", wowheadIds: { 'Fallen Defender': 29764, 'Fallen Hero': 29762, 'Fallen Champion': 29763 } },
      { slot: 'Chest', namePattern: 'Chestguard of the Fallen', boss: "Magtheridon", raid: "Magtheridon's Lair", wowheadIds: { 'Fallen Defender': 29753, 'Fallen Hero': 29754, 'Fallen Champion': 29755 } },
      { slot: 'Hands', namePattern: 'Gloves of the Fallen', boss: 'The Curator', raid: 'Karazhan', wowheadIds: { 'Fallen Defender': 29758, 'Fallen Hero': 29756, 'Fallen Champion': 29757 } },
      { slot: 'Legs', namePattern: 'Leggings of the Fallen', boss: 'Gruul the Dragonkiller', raid: "Gruul's Lair", wowheadIds: { 'Fallen Defender': 29767, 'Fallen Hero': 29765, 'Fallen Champion': 29766 } },
    ],
    pieces: {
      Druid: { Head: 'Nordrassil Headdress', Shoulder: 'Nordrassil Wrath-Mantle', Chest: 'Nordrassil Chestpiece', Hands: 'Nordrassil Handgrips', Legs: 'Nordrassil Feral-Kilt' },
      Priest: { Head: 'Light-Collar of the Incarnate', Shoulder: 'Soul-Mantle of the Incarnate', Chest: 'Shroud of the Incarnate', Hands: 'Handwraps of the Incarnate', Legs: 'Trousers of the Incarnate' },
      Warrior: { Head: 'Warbringer Greathelm', Shoulder: 'Warbringer Shoulderguards', Chest: 'Warbringer Breastplate', Hands: 'Warbringer Handguards', Legs: 'Warbringer Legguards' },
      Hunter: { Head: 'Demon Stalker Greathelm', Shoulder: 'Demon Stalker Shoulderguards', Chest: 'Demon Stalker Harness', Hands: 'Demon Stalker Gauntlets', Legs: 'Demon Stalker Greaves' },
      Mage: { Head: 'Collar of the Aldor', Shoulder: 'Mantle of the Aldor', Chest: 'Vestments of the Aldor', Hands: 'Gloves of the Aldor', Legs: 'Legwraps of the Aldor' },
      Warlock: { Head: 'Voidheart Crown', Shoulder: 'Voidheart Mantle', Chest: 'Voidheart Robe', Hands: 'Voidheart Gloves', Legs: 'Voidheart Leggings' },
      Paladin: { Head: 'Justicar Diadem', Shoulder: 'Justicar Shoulderguards', Chest: 'Justicar Chestpiece', Hands: 'Justicar Handguards', Legs: 'Justicar Legguards' },
      Rogue: { Head: 'Netherblade Facemask', Shoulder: 'Netherblade Shoulderpads', Chest: 'Netherblade Chestpiece', Hands: 'Netherblade Gloves', Legs: 'Netherblade Breeches' },
      Shaman: { Head: 'Cyclone Headdress', Shoulder: 'Cyclone Shoulderguards', Chest: 'Cyclone Hauberk', Hands: 'Cyclone Handguards', Legs: 'Cyclone Legguards' },
    },
  },
  T5: {
    phase: 'P2',
    tokens: [
      { slot: 'Head', namePattern: 'Helm of the Vanquished', boss: 'Lady Vashj', raid: 'Serpentshrine Cavern', wowheadIds: { 'Fallen Defender': 30243, 'Fallen Hero': 30244, 'Fallen Champion': 30242 } },
      { slot: 'Shoulder', namePattern: 'Pauldrons of the Vanquished', boss: 'Void Reaver', raid: 'Tempest Keep', wowheadIds: { 'Fallen Defender': 30249, 'Fallen Hero': 30250, 'Fallen Champion': 30248 } },
      { slot: 'Chest', namePattern: 'Chestguard of the Vanquished', boss: "Kael'thas Sunstrider", raid: 'Tempest Keep', wowheadIds: { 'Fallen Defender': 30237, 'Fallen Hero': 30238, 'Fallen Champion': 30236 } },
      { slot: 'Hands', namePattern: 'Gloves of the Vanquished', boss: 'Leotheras the Blind', raid: 'Serpentshrine Cavern', wowheadIds: { 'Fallen Defender': 30240, 'Fallen Hero': 30241, 'Fallen Champion': 30239 } },
      { slot: 'Legs', namePattern: 'Leggings of the Vanquished', boss: 'Fathom-Lord Karathress', raid: 'Serpentshrine Cavern', wowheadIds: { 'Fallen Defender': 30246, 'Fallen Hero': 30247, 'Fallen Champion': 30245 } },
    ],
    pieces: {
      Druid: { Head: 'Nordrassil Headguard', Shoulder: 'Nordrassil Shoulderguards', Chest: 'Nordrassil Chestguard', Hands: 'Nordrassil Gloves', Legs: 'Nordrassil Life-Kilt' },
      Priest: { Head: 'Cowl of the Avatar', Shoulder: 'Mantle of the Avatar', Chest: 'Vestments of the Avatar', Hands: 'Gloves of the Avatar', Legs: 'Breeches of the Avatar' },
      Warrior: { Head: 'Destroyer Greathelm', Shoulder: 'Destroyer Shoulderguards', Chest: 'Destroyer Breastplate', Hands: 'Destroyer Handguards', Legs: 'Destroyer Legguards' },
      Hunter: { Head: 'Rift Stalker Helm', Shoulder: 'Rift Stalker Mantle', Chest: 'Rift Stalker Hauberk', Hands: 'Rift Stalker Gauntlets', Legs: 'Rift Stalker Leggings' },
      Mage: { Head: 'Cowl of Tirisfal', Shoulder: 'Mantle of Tirisfal', Chest: 'Robes of Tirisfal', Hands: 'Gloves of Tirisfal', Legs: 'Leggings of Tirisfal' },
      Warlock: { Head: 'Hood of the Corruptor', Shoulder: 'Mantle of the Corruptor', Chest: 'Robe of the Corruptor', Hands: 'Gloves of the Corruptor', Legs: 'Leggings of the Corruptor' },
      Paladin: { Head: 'Crystalforge Greathelm', Shoulder: 'Crystalforge Shoulderguards', Chest: 'Crystalforge Chestguard', Hands: 'Crystalforge Handguards', Legs: 'Crystalforge Legguards' },
      Rogue: { Head: 'Deathmantle Helm', Shoulder: 'Deathmantle Shoulderpads', Chest: 'Deathmantle Chestguard', Hands: 'Deathmantle Handguards', Legs: 'Deathmantle Legguards' },
      Shaman: { Head: 'Cataclysm Headguard', Shoulder: 'Cataclysm Shoulderguards', Chest: 'Cataclysm Chestguard', Hands: 'Cataclysm Gloves', Legs: 'Cataclysm Legguards' },
    },
  },
  T6: {
    phase: 'P3',
    tokens: [
      // T6 uses Forgotten Conqueror/Protector/Vanquisher (different class distribution!)
      { slot: 'Head', namePattern: 'Helm of the Forgotten', boss: 'Archimonde', raid: 'Mount Hyjal', wowheadIds: { 'Forgotten Conqueror': 31097, 'Forgotten Protector': 31095, 'Forgotten Vanquisher': 31096 } },
      { slot: 'Shoulder', namePattern: 'Pauldrons of the Forgotten', boss: 'Mother Shahraz', raid: 'Black Temple', wowheadIds: { 'Forgotten Conqueror': 31101, 'Forgotten Protector': 31102, 'Forgotten Vanquisher': 31103 } },
      { slot: 'Chest', namePattern: 'Chestguard of the Forgotten', boss: 'Illidan Stormrage', raid: 'Black Temple', wowheadIds: { 'Forgotten Conqueror': 31089, 'Forgotten Protector': 31090, 'Forgotten Vanquisher': 31091 } },
      { slot: 'Hands', namePattern: 'Gloves of the Forgotten', boss: 'Azgalor', raid: 'Mount Hyjal', wowheadIds: { 'Forgotten Conqueror': 31092, 'Forgotten Protector': 31093, 'Forgotten Vanquisher': 31094 } },
      { slot: 'Legs', namePattern: 'Leggings of the Forgotten', boss: 'The Illidari Council', raid: 'Black Temple', wowheadIds: { 'Forgotten Conqueror': 31098, 'Forgotten Protector': 31099, 'Forgotten Vanquisher': 31100 } },
      // Sunwell tokens (P5)
      { slot: 'Wrist', namePattern: 'Bracers of the Forgotten', boss: 'Kalecgos', raid: 'Sunwell Plateau', wowheadIds: { 'Forgotten Conqueror': 34848, 'Forgotten Protector': 34851, 'Forgotten Vanquisher': 34852 } },
      { slot: 'Waist', namePattern: 'Belt of the Forgotten', boss: 'Brutallus', raid: 'Sunwell Plateau', wowheadIds: { 'Forgotten Conqueror': 34853, 'Forgotten Protector': 34854, 'Forgotten Vanquisher': 34855 } },
      { slot: 'Feet', namePattern: 'Boots of the Forgotten', boss: 'Felmyst', raid: 'Sunwell Plateau', wowheadIds: { 'Forgotten Conqueror': 34856, 'Forgotten Protector': 34857, 'Forgotten Vanquisher': 34858 } },
    ],
    pieces: {
      Druid: { Head: 'Thunderheart Cover', Shoulder: 'Thunderheart Pauldrons', Chest: 'Thunderheart Tunic', Hands: 'Thunderheart Gloves', Legs: 'Thunderheart Leggings', Wrist: 'Thunderheart Wristguards', Waist: 'Thunderheart Belt', Feet: 'Thunderheart Boots' },
      Priest: { Head: 'Cowl of Absolution', Shoulder: 'Shoulderpads of Absolution', Chest: 'Vestments of Absolution', Hands: 'Handguards of Absolution', Legs: 'Breeches of Absolution', Wrist: 'Cuffs of Absolution', Waist: 'Belt of Absolution', Feet: 'Boots of Absolution' },
      Warrior: { Head: 'Onslaught Greathelm', Shoulder: 'Onslaught Shoulderguards', Chest: 'Onslaught Breastplate', Hands: 'Onslaught Handguards', Legs: 'Onslaught Legguards', Wrist: 'Onslaught Wristguards', Waist: 'Onslaught Belt', Feet: 'Onslaught Boots' },
      Hunter: { Head: 'Gronnstalker\'s Helmet', Shoulder: 'Gronnstalker\'s Spaulders', Chest: 'Gronnstalker\'s Chestguard', Hands: 'Gronnstalker\'s Gloves', Legs: 'Gronnstalker\'s Leggings', Wrist: 'Gronnstalker\'s Bracers', Waist: 'Gronnstalker\'s Belt', Feet: 'Gronnstalker\'s Boots' },
      Mage: { Head: 'Cowl of the Tempest', Shoulder: 'Mantle of the Tempest', Chest: 'Robes of the Tempest', Hands: 'Gloves of the Tempest', Legs: 'Leggings of the Tempest', Wrist: 'Bracers of the Tempest', Waist: 'Belt of the Tempest', Feet: 'Boots of the Tempest' },
      Warlock: { Head: 'Hood of the Malefic', Shoulder: 'Mantle of the Malefic', Chest: 'Robe of the Malefic', Hands: 'Gloves of the Malefic', Legs: 'Leggings of the Malefic', Wrist: 'Bracers of the Malefic', Waist: 'Belt of the Malefic', Feet: 'Boots of the Malefic' },
      Paladin: { Head: 'Lightbringer Greathelm', Shoulder: 'Lightbringer Shoulderguards', Chest: 'Lightbringer Chestguard', Hands: 'Lightbringer Handguards', Legs: 'Lightbringer Legguards', Wrist: 'Lightbringer Wristguards', Waist: 'Lightbringer Belt', Feet: 'Lightbringer Boots' },
      Rogue: { Head: 'Slayer\'s Helm', Shoulder: 'Slayer\'s Shoulderpads', Chest: 'Slayer\'s Chestguard', Hands: 'Slayer\'s Handguards', Legs: 'Slayer\'s Legguards', Wrist: 'Slayer\'s Bracers', Waist: 'Slayer\'s Belt', Feet: 'Slayer\'s Boots' },
      Shaman: { Head: 'Skyshatter Cover', Shoulder: 'Skyshatter Pauldrons', Chest: 'Skyshatter Tunic', Hands: 'Skyshatter Gloves', Legs: 'Skyshatter Leggings', Wrist: 'Skyshatter Wristguards', Waist: 'Skyshatter Belt', Feet: 'Skyshatter Boots' },
    },
  },
};

export async function POST() {
  try {
    let created = 0;
    let skipped = 0;

    for (const [tier, tierData] of Object.entries(TIER_TOKENS)) {
      for (const tokenInfo of tierData.tokens) {
        for (const [tokenType, classes] of Object.entries(TOKEN_TYPES)) {
          // Extract just the suffix (Defender/Hero/Champion) to avoid duplication
          // e.g., "Fallen Champion" -> "Champion" when namePattern already has "Fallen"
          const tokenSuffix = tokenType.split(' ').pop() || tokenType;
          const tokenName = `${tokenInfo.namePattern} ${tokenSuffix}`;
          const wowheadId = tokenInfo.wowheadIds[tokenType as keyof typeof tokenInfo.wowheadIds];

          // Check if already exists
          const existing = await prisma.tierToken.findUnique({
            where: {
              tokenType_tier_slot: {
                tokenType,
                tier,
                slot: tokenInfo.slot,
              },
            },
          });

          if (existing) {
            // Update existing token - fix name and icon
            const updateData: { name?: string; icon?: string } = {};

            // Fix duplicated "Fallen" in name
            if (existing.name !== tokenName) {
              updateData.name = tokenName;
            }

            // Add icon if missing
            if (!existing.icon && wowheadId && TOKEN_ICONS[wowheadId]) {
              updateData.icon = TOKEN_ICONS[wowheadId];
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.tierToken.update({
                where: { id: existing.id },
                data: updateData,
              });
            }
            skipped++;
            continue;
          }

          // Create token with linked pieces
          await prisma.tierToken.create({
            data: {
              name: tokenName,
              wowheadId,
              icon: wowheadId ? TOKEN_ICONS[wowheadId] || null : null,
              tokenType,
              tier,
              slot: tokenInfo.slot,
              boss: tokenInfo.boss,
              raid: tokenInfo.raid,
              phase: tierData.phase,
              linkedPieces: {
                create: classes.map((className) => ({
                  className,
                  pieceName: tierData.pieces[className as keyof typeof tierData.pieces]?.[tokenInfo.slot as keyof (typeof tierData.pieces)['Druid']] || 'Unknown',
                })),
              },
            },
          });

          created++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Created ${created} tokens, skipped ${skipped} existing`,
    });
  } catch (error) {
    console.error('Failed to seed tier tokens:', error);
    return NextResponse.json(
      { error: 'Failed to seed tier tokens' },
      { status: 500 }
    );
  }
}
