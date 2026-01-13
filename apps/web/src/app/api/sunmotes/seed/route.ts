import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// All Sunwell Plateau Sunmote upgrade paths
const SUNMOTE_UPGRADES = [
  // Cloth - Caster DPS
  { base: 'Pantaloons of Growing Strife', baseId: 34916, upgraded: 'Sunfire Pantaloons', upgradedId: 34917, slot: 'Legs', armor: 'Cloth' },
  { base: 'Robe of Faltered Light', baseId: 34918, upgraded: 'Sunfire Robe', upgradedId: 34919, slot: 'Chest', armor: 'Cloth' },
  { base: 'Bracers of the Forgotten Conqueror', baseId: 34920, upgraded: 'Sunfire Bracers', upgradedId: 34921, slot: 'Wrist', armor: 'Cloth' },

  // Cloth - Healer
  { base: 'Leggings of Channeled Elements', baseId: 34937, upgraded: 'Sunfire Leggings', upgradedId: 34938, slot: 'Legs', armor: 'Cloth' },
  { base: 'Robes of Ghostly Hatred', baseId: 34923, upgraded: 'Sunfire Robes', upgradedId: 34924, slot: 'Chest', armor: 'Cloth' },
  { base: 'Bracers of Absolution', baseId: 34925, upgraded: 'Sunfire Bracers', upgradedId: 34926, slot: 'Wrist', armor: 'Cloth' },

  // Leather - Feral/Rogue
  { base: 'Leggings of the Immortal Night', baseId: 34939, upgraded: 'Sunfire Leggings', upgradedId: 34940, slot: 'Legs', armor: 'Leather' },
  { base: 'Carapace of Sun and Shadow', baseId: 34927, upgraded: 'Sunfire Carapace', upgradedId: 34928, slot: 'Chest', armor: 'Leather' },
  { base: 'Bracers of the Forgotten Vanquisher', baseId: 34929, upgraded: 'Sunfire Bracers', upgradedId: 34930, slot: 'Wrist', armor: 'Leather' },

  // Leather - Resto/Balance
  { base: 'Breeches of Natural Aggression', baseId: 34941, upgraded: 'Sunfire Breeches', upgradedId: 34942, slot: 'Legs', armor: 'Leather' },
  { base: 'Vestments of the Sea-Witch', baseId: 34931, upgraded: 'Sunfire Vestments', upgradedId: 34932, slot: 'Chest', armor: 'Leather' },
  { base: 'Naturalist\'s Preserving Cinch', baseId: 34933, upgraded: 'Sunfire Belt', upgradedId: 34934, slot: 'Waist', armor: 'Leather' },

  // Mail - Hunter
  { base: 'Leggings of the Immortal Beast', baseId: 34935, upgraded: 'Sunfire Leggings', upgradedId: 34936, slot: 'Legs', armor: 'Mail' },
  { base: 'Garments of Serene Shores', baseId: 34943, upgraded: 'Sunfire Garments', upgradedId: 34944, slot: 'Chest', armor: 'Mail' },
  { base: 'Bracers of the Forgotten Protector', baseId: 34945, upgraded: 'Sunfire Bracers', upgradedId: 34946, slot: 'Wrist', armor: 'Mail' },

  // Mail - Shaman
  { base: 'Bow-stitched Leggings', baseId: 34947, upgraded: 'Sunfire Bow-stitched Leggings', upgradedId: 34948, slot: 'Legs', armor: 'Mail' },
  { base: 'Hauberk of the Furious Elements', baseId: 34949, upgraded: 'Sunfire Hauberk', upgradedId: 34950, slot: 'Chest', armor: 'Mail' },
  { base: 'Skyshatter Wristguards', baseId: 34951, upgraded: 'Sunfire Wristguards', upgradedId: 34952, slot: 'Wrist', armor: 'Mail' },

  // Plate - Tank
  { base: 'Legplates of the Holy Juggernaut', baseId: 34953, upgraded: 'Sunfire Legplates', upgradedId: 34954, slot: 'Legs', armor: 'Plate' },
  { base: 'Breastplate of Agony\'s Aversion', baseId: 34955, upgraded: 'Sunfire Breastplate', upgradedId: 34956, slot: 'Chest', armor: 'Plate' },
  { base: 'Bracers of the Forgotten Defender', baseId: 34957, upgraded: 'Sunfire Bracers', upgradedId: 34958, slot: 'Wrist', armor: 'Plate' },

  // Plate - DPS
  { base: 'Greaves of Pacification', baseId: 34959, upgraded: 'Sunfire Greaves', upgradedId: 34960, slot: 'Legs', armor: 'Plate' },
  { base: 'Warharness of Reckless Fury', baseId: 34961, upgraded: 'Sunfire Warharness', upgradedId: 34962, slot: 'Chest', armor: 'Plate' },
  { base: 'Onslaught Wristguards', baseId: 34963, upgraded: 'Sunfire Wristguards', upgradedId: 34964, slot: 'Wrist', armor: 'Plate' },

  // Plate - Holy Paladin
  { base: 'Lightbringer Legguards', baseId: 34965, upgraded: 'Sunfire Legguards', upgradedId: 34966, slot: 'Legs', armor: 'Plate' },
  { base: 'Lightbringer Chestguard', baseId: 34967, upgraded: 'Sunfire Chestguard', upgradedId: 34968, slot: 'Chest', armor: 'Plate' },
  { base: 'Lightbringer Wristguards', baseId: 34969, upgraded: 'Sunfire Wristguards', upgradedId: 34970, slot: 'Wrist', armor: 'Plate' },
];

export async function POST() {
  try {
    let created = 0;
    let skipped = 0;

    for (const upgrade of SUNMOTE_UPGRADES) {
      // Check if already exists
      const existing = await prisma.sunmoteUpgrade.findUnique({
        where: { baseItemName: upgrade.base },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.sunmoteUpgrade.create({
        data: {
          baseItemName: upgrade.base,
          baseWowheadId: upgrade.baseId,
          upgradedName: upgrade.upgraded,
          upgradedWowheadId: upgrade.upgradedId,
          sunmotesRequired: 1,
          slot: upgrade.slot,
          armorType: upgrade.armor,
        },
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Created ${created} upgrades, skipped ${skipped} existing`,
    });
  } catch (error) {
    console.error('Failed to seed Sunmote upgrades:', error);
    return NextResponse.json(
      { error: 'Failed to seed Sunmote upgrades' },
      { status: 500 }
    );
  }
}
