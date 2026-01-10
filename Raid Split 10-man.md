interface RaidSplit {
  raidNumber: 1 | 2 | 3;
  players: {
    playerId: string;
    role: Role;
  }[];
  composition: {
    tanks: number;
    healers: number;
    dps: number;
  };
  itemsNeeded: {
    itemName: string;
    neededBy: string[]; // Player names
  }[];
}