# Integration Points

## RCLootCouncil Addon

### Import Format
CSV/TSV with columns:
- `player` - Character name
- `date` - Loot date
- `time` - Loot time
- `id` - Item ID
- `item` - Item name with link
- `itemID` - Wowhead item ID
- `itemString` - Full item string
- `response` - Player response (MS, OS, Pass)
- `votes` - Council votes
- `class` - Player class
- `instance` - Raid instance
- `boss` - Boss name
- `gear1`, `gear2` - Equipped items
- `responseID` - Response type ID
- `isAwardReason` - Award reason flag

### Export Format
Platform exports in RC-compatible format for in-game announcements:
```
/rc announce [Player] won [Item] for [Response]
```

### Workflow
1. During raid: ML uses "Award Later" to collect loot
2. After raid: Export responses from RC
3. Import to platform for council decision
4. Export awards back to RC for in-game distribution

## Wowhead Integration

### Item Data
- Icons: `https://wow.zamimg.com/images/wow/icons/{size}/{icon}.jpg`
- Tooltips: Script injection for hover tooltips
- Item URLs: `https://www.wowhead.com/tbc/item={itemId}`

### Import Sources
- Direct Wowhead item URLs
- Seventyupgrades BiS lists
- Zone/raid loot tables

### Icon Sizes
- `small` - 18x18
- `medium` - 36x36
- `large` - 56x56

## Discord Integration

### OAuth
- Provider: Discord
- Scopes: `identify`, `email`, `guilds`
- Callback: `/api/auth/callback/discord`

### Bot Features
- Post raid rosters as embeds
- Manage feedback channels
- Import server members
- Send screenshots
- Post log links

### Bot Permissions Required
- Send Messages
- Embed Links
- Attach Files
- Manage Channels (for feedback channels)
- Read Message History

### Embed Format
Raid rosters posted with:
- Role sections (Tanks, Healers, DPS)
- Class-colored player names
- Soft-res URL link
- Split identification

## Raid Helper Integration

### API
- Get scheduled events
- Fetch event signups
- Map signups to roster players

### Data Mapping
```typescript
interface RaidHelperSignup {
  odiscordId: string;
  name: string;
  className: string;
  specName: string;
  status: 'confirmed' | 'tentative' | 'declined';
}
```

## Soft-Res Integration

### URL Generation
```
https://softres.it/raid/{raidId}?raiders={comma-separated-names}
```

### Supported Raids
- Karazhan
- Gruul's Lair
- Magtheridon's Lair
- Serpentshrine Cavern
- Tempest Keep
- Mount Hyjal
- Black Temple
- Sunwell Plateau

## Database (PostgreSQL)

### Connection
- Provider: Railway PostgreSQL
- ORM: Prisma
- Connection pooling via Prisma

### Schema Management
- Migrations via `prisma migrate`
- Schema push via `prisma db push`
- Client generation via `prisma generate`

## Authentication Flow

1. User clicks "Login with Discord"
2. Redirect to Discord OAuth
3. Discord returns with auth code
4. Exchange code for tokens
5. Create/update user record
6. Create session
7. Clear old sessions for user
8. Redirect to dashboard

## Session Management

- Strategy: Database sessions
- Provider: Prisma adapter
- Auto-cleanup on login
- Admin endpoint for force logout
