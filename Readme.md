# HOOLIGANS Guild Loot Council Platform

A comprehensive WoW Classic guild management platform for loot council, roster management, attendance tracking, and raid organization.

## Live Application

**Production URL:** https://hooligans-guild-production.up.railway.app

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** NextAuth.js with Discord OAuth
- **Styling:** TailwindCSS + shadcn/ui
- **Deployment:** Railway
- **Package Manager:** pnpm workspaces (monorepo)

## Project Structure

```
HOOLIGANS Guild/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── src/
│       │   ├── app/            # App router pages
│       │   │   ├── api/        # API routes
│       │   │   ├── dashboard/  # Dashboard pages
│       │   │   └── login/      # Auth pages
│       │   ├── components/     # React components
│       │   │   ├── ui/         # shadcn/ui components
│       │   │   ├── drops/      # Loot tracking components
│       │   │   ├── splits/     # Raid split components
│       │   │   └── layout/     # Layout components
│       │   └── lib/            # Utilities and helpers
│       └── scripts/            # Build/deploy scripts
├── packages/
│   ├── database/               # Prisma schema and client
│   └── shared/                 # Shared constants and types
└── docs/                       # Documentation
```

## Features

### Implemented

- **Dashboard** - Guild overview with quick stats, raid schedules, and leadership info
- **Roster Management** - Full CRUD for players with class/spec/role assignment
- **Drops (Loot Tracking)** - Real-time loot distribution during raids
  - Item assignment with BiS indicators
  - RCLootCouncil import/export integration
  - Session management (finalize/clear)
  - Expandable token and sunmote item rows
- **Items Database** - Complete item management with Wowhead integration
  - BiS per spec configuration
  - Token redemption system
  - Sunmote upgrade linking
  - Phase-based organization
- **BiS Configuration** - Per-player BiS list management
  - Import from Wowhead (Seventyupgrades)
  - Current phase and next phase tracking
  - Completion percentage tracking
- **Attendance** - Raid attendance tracking with percentage calculations
- **10-Man Splits** - Auto-balanced raid compositions
  - Role distribution optimization
  - Drag-and-drop player assignment
  - Discord integration for posting rosters
- **Performance Tracking** - Player performance notes and ratings
- **Loot History** - Complete loot history with filtering
- **Reports** - Analytics on loot distribution and attendance
- **Discord Integration** - Bot for roster posting, channels, and notifications
- **Multi-Team Support** - Support for multiple raid teams

### Authentication & Authorization

- Discord OAuth login
- Role-based access (Member, Raider, Officer, Guild Master)
- Team-based permissions

## API Endpoints

### Players
- `GET /api/players` - List all players (filterable by team)
- `POST /api/players` - Create player (single or bulk import)
- `GET /api/players/[id]` - Get player details
- `PATCH /api/players/[id]` - Update player
- `DELETE /api/players/[id]` - Deactivate player
- `GET /api/players/[id]/bis-status` - Get BiS completion status
- `GET /api/players/[id]/gear` - Get player gear/loot history

### Items
- `GET /api/items` - List all items with BiS info
- `POST /api/items` - Create item
- `GET /api/items/[id]` - Get item details
- `PATCH /api/items/[id]` - Update item
- `DELETE /api/items` - Delete items by raid
- `GET /api/items/search` - Search items
- `POST /api/items/import-wowhead` - Import from Wowhead URL

### Loot
- `GET /api/loot` - Get current session or history
- `POST /api/loot` - Add loot record
- `PATCH /api/loot/[id]` - Update loot record (assign player)
- `DELETE /api/loot/[id]` - Delete loot record
- `POST /api/loot/import-rc` - Import from RCLootCouncil
- `POST /api/loot/finalize-session` - Finalize current session
- `DELETE /api/loot/clear-session` - Clear current session

### BiS
- `GET /api/bis` - Get BiS configurations
- `POST /api/bis/import` - Import BiS list from Wowhead
- `GET /api/bis/player` - Get player BiS configurations

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Record attendance

### Splits
- `GET /api/splits` - Get raid splits
- `POST /api/splits` - Create/update splits
- `POST /api/splits/auto-balance` - Auto-balance teams

### Discord
- `GET /api/discord/members` - Get Discord server members
- `POST /api/discord/send-raid-embeds` - Post raid roster to Discord
- `POST /api/discord/send-screenshot` - Send screenshot to Discord
- Various channel management endpoints

## Environment Variables

```env
DATABASE_URL=<postgresql-connection-string>
NEXTAUTH_URL=https://hooligans-guild-production.up.railway.app
NEXTAUTH_SECRET=<generated-secret>
DISCORD_CLIENT_ID=<discord-oauth-client-id>
DISCORD_CLIENT_SECRET=<discord-oauth-client-secret>
DISCORD_BOT_TOKEN=<discord-bot-token>
DISCORD_GUILD_ID=<discord-server-id>
```

## Development

See [CLAUDE.md](./CLAUDE.md) for development workflow rules.

**Key Rule:** Never develop locally. All changes are pushed directly to main and deployed via Railway.

## Database

The database schema includes:
- `User` - Auth users linked to Discord
- `Player` - Raid roster members
- `Team` - Raid teams (for multi-team support)
- `Item` - Loot database with Wowhead integration
- `LootRecord` - Loot history and current session
- `PlayerBisConfiguration` - Per-player BiS lists
- `Attendance` - Raid attendance records
- `TokenRedemption` - Token to gear mappings
- `SunmoteRedemption` - Sunmote upgrade mappings
- `RosterAssignment` - Split raid assignments
- `Performance` - Player performance tracking

## Discord Bot Features

- Post raid rosters with class icons and soft-res links
- Manage feedback channels
- Import members to roster
- Send screenshots to channels
- Role-based access control

## Contributing

This is a private guild application. Contact guild leadership for access.
