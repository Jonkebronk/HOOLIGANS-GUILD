interface LootRecord {
  id: string;
  itemId: string;
  playerId: string;
  response: LootResponse;
  date: Date;
  phase: Phase;
  lootPoints: number;
  slot: GearSlot;
  
  // RCLootCouncil import fields
  rcTimestamp?: string;
  rcSessionId?: string;
}

type LootResponse = 
  | 'BiS' | 'Greater Upgrade' | 'Minor Upgrade' 
  | 'Offspec' | 'PvP' | 'Disenchant';