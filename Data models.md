interface Player {
  id: string;
  name: string;
  class: WowClass;
  mainSpec: ClassSpec;
  offSpec: ClassSpec | null;
  notes: string; // e.g., "BiS wep P1-2", "pass on crafting"
  active: boolean;
  joinedDate: Date;
  raidTeam: number | null; // 1, 2, 3 for 10-man splits
  
  // Calculated fields
  attendancePercentage: number;
  totalLootCount: number;
  lootPointsTotal: number;
  bisPercentage: number;
  daysSinceLastItem: number;
}

type WowClass = 
  | 'Druid' | 'Hunter' | 'Mage' | 'Paladin' 
  | 'Priest' | 'Rogue' | 'Shaman' | 'Warlock' | 'Warrior';

type ClassSpec = 
  | 'DruidBalance' | 'DruidRestoration' | 'DruidFeral' | 'DruidGuardian'
  | 'HunterMarksmanship' | 'HunterSurvival' | 'HunterBeastMastery'
  | 'MageArcane' | 'MageFire' | 'MageFrost'
  | 'PaladinProtection' | 'PaladinHoly' | 'PaladinRetribution'
  | 'PriestShadow' | 'PriestDiscipline' | 'PriestHoly'
  | 'RogueAssassination' | 'RogueSubtlety' | 'RogueCombat'
  | 'ShamanElemental' | 'ShamanRestoration' | 'ShamanEnhancement'
  | 'WarlockDemonology' | 'WarlockAffliction' | 'WarlockDestruction'
  | 'WarriorFury' | 'WarriorProtection' | 'WarriorArms';

type Role = 'DPS' | 'Tank' | 'Heal';
type RoleSubtype = 'DPS-Melee' | 'DPS-Ranged' | 'DPS-Caster' | 'Heal' | 'Tank';