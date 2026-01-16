# Data Models

## Core Types

### Player
```typescript
interface Player {
  id: string;
  name: string;
  class: WowClass;
  mainSpec: ClassSpec;
  offSpec: ClassSpec | null;
  role: Role;
  roleSubtype: RoleSubtype;
  notes: string | null;
  active: boolean;
  joinedDate: Date;
  discordId: string | null;
  teamId: string | null;

  // Relations
  team: Team | null;
  lootRecords: LootRecord[];
  bisConfigurations: PlayerBisConfiguration[];
  attendance: Attendance[];
  performance: Performance[];
}
```

### Item
```typescript
interface Item {
  id: string;
  name: string;
  wowheadId: number;
  icon: string | null;
  quality: number; // 0=Poor, 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary
  slot: ItemSlot;
  raid: string;
  boss: string;
  phase: string; // P1-P5
  lootPriority: string | null;

  // Relations
  bisSpecs: ItemBisSpec[];
  lootRecords: LootRecord[];
  tokenRedemptions: TokenRedemption[]; // Items this token can be redeemed for
  redemptionFromToken: TokenRedemption | null; // Token this item comes from
  sunmoteRedemption: SunmoteRedemption | null; // If this is a base item
  sunmoteUpgradedFrom: SunmoteRedemption[]; // If this is an upgraded item
}
```

### LootRecord
```typescript
interface LootRecord {
  id: string;
  itemId: string | null;
  itemName: string | null; // For RC import without DB item
  wowheadId: number | null;
  quality: number | null;
  playerId: string | null;
  teamId: string;
  response: string | null; // MS, OS, Pass, etc.
  lootDate: Date;
  lootPoints: number;
  phase: string;
  finalized: boolean;

  // Relations
  item: Item | null;
  player: Player | null;
  team: Team;
}
```

### PlayerBisConfiguration
```typescript
interface PlayerBisConfiguration {
  id: string;
  playerId: string;
  slot: ItemSlot;
  wowheadId: number | null;
  itemName: string | null;
  phase: string; // P1, P2, etc.
  obtained: boolean;

  // Relations
  player: Player;
}
```

### TokenRedemption
```typescript
interface TokenRedemption {
  id: string;
  tokenItemId: string; // The token item
  redemptionItemId: string; // The gear piece
  className: string; // Which class can redeem

  // Relations
  tokenItem: Item;
  redemptionItem: Item;
}
```

### SunmoteRedemption
```typescript
interface SunmoteRedemption {
  id: string;
  baseItemId: string; // The base Sunwell item
  upgradedItemId: string; // The upgraded item
  sunmotesRequired: number; // Usually 1

  // Relations
  baseItem: Item;
  upgradedItem: Item;
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  description: string | null;

  // Relations
  players: Player[];
  lootRecords: LootRecord[];
}
```

### User (Auth)
```typescript
interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  discordId: string | null;
  discordName: string | null;

  // Relations
  accounts: Account[];
  sessions: Session[];
}
```

## Enums

### WowClass
```typescript
type WowClass =
  | 'Druid' | 'Hunter' | 'Mage' | 'Paladin'
  | 'Priest' | 'Rogue' | 'Shaman' | 'Warlock' | 'Warrior';
```

### ClassSpec
```typescript
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
```

### Role
```typescript
type Role = 'DPS' | 'Tank' | 'Healer';
```

### RoleSubtype
```typescript
type RoleSubtype =
  | 'DPS_Melee' | 'DPS_Ranged' | 'DPS_Caster'
  | 'Healer' | 'Tank';
```

### ItemSlot
```typescript
type ItemSlot =
  | 'Head' | 'Neck' | 'Shoulder' | 'Back' | 'Chest'
  | 'Wrist' | 'Hands' | 'Waist' | 'Legs' | 'Feet'
  | 'Ring' | 'Trinket' | 'MainHand' | 'OffHand' | 'Ranged'
  | 'TwoHand' | 'OneHand' | 'Token' | 'Other';
```

### UserRole
```typescript
type UserRole = 'MEMBER' | 'RAIDER' | 'OFFICER' | 'GUILD_MASTER';
```

## Item Quality Colors

```typescript
const ITEM_QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d', // Poor (gray)
  1: '#ffffff', // Common (white)
  2: '#1eff00', // Uncommon (green)
  3: '#0070dd', // Rare (blue)
  4: '#a335ee', // Epic (purple)
  5: '#ff8000', // Legendary (orange)
};
```

## WoW Class Colors

```typescript
const CLASS_COLORS: Record<string, string> = {
  Druid: '#FF7C0A',
  Hunter: '#AAD372',
  Mage: '#3FC7EB',
  Paladin: '#F48CBA',
  Priest: '#FFFFFF',
  Rogue: '#FFF468',
  Shaman: '#0070DD',
  Warlock: '#8788EE',
  Warrior: '#C69B6D',
};
```
