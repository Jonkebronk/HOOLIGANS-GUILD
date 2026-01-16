# Business Logic

## Loot Council Criteria

The loot council evaluates candidates based on four main criteria:

1. **Engagement** - Participation and effort in guild activities
2. **Attendance** - Presence and preparation for raids
3. **Performance** - Output and mechanics execution
4. **Upgrade Value** - How much the item improves the player

## BiS Priority System

### Current Phase BiS
Items that are BiS for the current content phase get highest priority.

### Next Phase BiS
Items that will become BiS in future phases are tracked separately for planning.

### BiS Matching Logic
```typescript
function getBisPlayersForItem(item: Item, bisConfigs: PlayerBisConfiguration[]) {
  const directMatches = bisConfigs.filter(c => c.wowheadId === item.wowheadId);

  // For tokens, also check redemption items
  if (item.tokenRedemptions) {
    for (const redemption of item.tokenRedemptions) {
      const redemptionMatches = bisConfigs.filter(
        c => c.wowheadId === redemption.redemptionItem.wowheadId
      );
      directMatches.push(...redemptionMatches);
    }
  }

  // For sunmote items, check upgraded item
  if (item.sunmoteRedemption) {
    const upgradeMatches = bisConfigs.filter(
      c => c.wowheadId === item.sunmoteRedemption.upgradedItem.wowheadId
    );
    directMatches.push(...upgradeMatches);
  }

  return directMatches;
}
```

### BiS Filtering
Players are removed from BiS lists when:
- They have been assigned the item in current session
- They have the item in finalized loot history
- For tokens: They have any of the redemption items
- For sunmote items: They have the upgraded item

## Attendance Calculation

```typescript
function calculateAttendance(records: AttendanceRecord[]): number {
  const totalRaids = records.length;
  const attendedRaids = records.filter(r => r.attended).length;
  return totalRaids > 0 ? (attendedRaids / totalRaids) * 100 : 0;
}
```

## Raider Stats Calculation

### Loot This Raid (LTR)
Count of items assigned to player in current session (non-finalized).

### Total Loot
Count of all items assigned to player (finalized + current session).

### Days Since Last Item
```typescript
function daysSinceLastItem(player: Player, lootHistory: LootRecord[]): string {
  const playerLoot = lootHistory.filter(r => r.playerId === player.id);
  const totalDays = daysSince(player.joinedDate);

  if (playerLoot.length === 0) {
    return `-/${totalDays}`;
  }

  const lastLoot = Math.max(...playerLoot.map(r => r.lootDate.getTime()));
  const daysSince = Math.floor((Date.now() - lastLoot) / (1000 * 60 * 60 * 24));
  return `${daysSince}/${totalDays}`;
}
```

## Token System

### Token Types
- Tier tokens (e.g., "Helm of the Forgotten Protector")
- Badge tokens
- Special tokens (e.g., Sunmote upgrades)

### Token Redemption Logic
```typescript
interface TokenRedemption {
  tokenItem: Item;      // The token that drops
  redemptionItem: Item; // The gear piece it becomes
  className: string;    // Which class can redeem
}

// When displaying token drops:
// 1. Show the token item
// 2. Show expandable list of redemption items
// 3. Filter by class if applicable
// 4. Check BiS for each redemption item
```

## Sunmote System

### Sunmote Upgrades
Some Sunwell items can be upgraded with Sunmotes:
- Base item drops from boss
- Combined with 1 Sunmote at NPC
- Creates upgraded item

### Sunmote Logic
```typescript
interface SunmoteRedemption {
  baseItem: Item;       // The item that drops
  upgradedItem: Item;   // The upgraded version
  sunmotesRequired: number; // Usually 1
}

// When displaying sunmote items:
// 1. Show the base item
// 2. Show expandable row with upgraded item
// 3. Check BiS for upgraded item
// 4. Track who has looted upgraded item
```

## Session Management

### Current Session
- Non-finalized loot records
- Can assign/unassign players
- Can delete items
- BiS updates instantly

### Finalize Session
1. Mark assigned items as finalized
2. Delete unassigned items
3. Move to loot history
4. Reset session state

### Clear Session
- Delete all non-finalized records
- Optionally keep assigned items

## Role-Based Access

### Member
- View dashboard
- View own BiS status

### Raider
- View all rosters and stats
- View loot history

### Officer
- Full CRUD on players, items, loot
- Manage splits and attendance
- Discord integrations
- Session management

### Guild Master
- All officer permissions
- Admin functions
- User role management

## Split Balancing

### Auto-Balance Algorithm
1. Calculate role requirements (tanks, healers, DPS)
2. Distribute by role subtype (melee, ranged, caster)
3. Balance class distribution
4. Consider item needs per split
5. Respect player preferences if set

### Role Distribution Target
- Tanks: 2
- Healers: 2-3
- DPS: 5-6
- Total: 10 per split

## Performance Tracking

### Rating System
1-5 stars based on:
- Mechanics execution
- DPS/HPS output
- Attendance reliability
- Team contribution

### Notes
Free-form notes for:
- Improvement areas
- Positive feedback
- Special circumstances
