interface Item {
  id: string;
  name: string;
  slot: GearSlot;
  raid: Raid;
  boss: string;
  phase: Phase;
  wowheadLink?: string;
  
  // Priority settings
  lootPriority?: string; // e.g., "WarriorProtection/PvP"
  bisCurrentPhase: ClassSpec[]; // Specs for which this is BiS current phase
  bisNextPhase: ClassSpec[]; // Specs for which this is BiS next phase
  lootPoints: number; // 200 for BiS, 100 for Greater Upgrade, 50 for Minor Upgrade
}

type GearSlot = 
  | 'Head' | 'Neck' | 'Shoulder' | 'Back' | 'Chest' 
  | 'Wrist' | 'Hands' | 'Waist' | 'Legs' | 'Feet'
  | 'Finger1' | 'Finger2' | 'Trinket1' | 'Trinket2'
  | 'Weapon1' | 'Weapon2' | 'Ranged' | 'SetPiece';

type Phase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

type Raid = 
  | 'Karazhan' | 'Gruuls Lair' | 'Magtheridons Lair'
  | 'Serpentshrine Caverns' | 'Tempest Keep'
  | 'Hyjal Summit' | 'Black Temple' | 'ZulAman'
  | 'Sunwell Plateau';