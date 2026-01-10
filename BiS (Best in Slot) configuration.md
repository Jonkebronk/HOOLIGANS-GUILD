interface BisConfiguration {
  spec: ClassSpec;
  phase: Phase;
  slots: {
    [key in GearSlot]?: {
      itemName: string;
      source: string; // Boss/location
    };
  };
}

interface PlayerBisStatus {
  playerId: string;
  currentPhase: {
    [key in GearSlot]?: {
      itemName: string;
      obtained: boolean;
    };
  };
  nextPhase: {
    [key in GearSlot]?: {
      itemName: string;
      obtained: boolean;
    };
  };
  tierSets: {
    tier4: number; // pieces collected
    tier5: number;
    tier6: number;
  };
}