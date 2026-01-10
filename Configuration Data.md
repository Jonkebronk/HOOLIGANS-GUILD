interface ClassConfiguration {
  className: WowClass;
  colorHex: string;
  specs: ClassSpec[];
  tokenType: 'Fallen Defender' | 'Fallen Hero' | 'Fallen Champion';
}

interface TierSetConfiguration {
  tier: 'T4' | 'T5' | 'T6';
  className: WowClass;
  pieces: {
    chest: string;
    hands: string;
    head: string;
    legs: string;
    shoulders: string;
  };
}

interface LootPointValues {
  BiS: 200;
  'Greater Upgrade': 100;
  'Minor Upgrade': 50;
  Offspec: 25;
  PvP: 25;
}