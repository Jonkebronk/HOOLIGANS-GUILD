# API Endpoints

## Authentication
```
GET    /api/auth/[...nextauth]     # NextAuth.js handlers
GET    /api/debug/auth             # Debug auth state (dev only)
```

## Players
```
GET    /api/players                # List players (query: teamId)
POST   /api/players                # Create player (single or bulk mode)
PATCH  /api/players                # Assign unassigned players to team
GET    /api/players/[id]           # Get player details
PATCH  /api/players/[id]           # Update player
DELETE /api/players/[id]           # Deactivate player (soft delete)
GET    /api/players/[id]/bis-status # Get BiS completion status
GET    /api/players/[id]/gear      # Get player loot history
POST   /api/players/cleanup        # Clean up orphaned players
POST   /api/players/cleanup-duplicates # Remove duplicate players
```

## Items
```
GET    /api/items                  # List items with BiS info (query: teamId)
POST   /api/items                  # Create item
DELETE /api/items                  # Delete items by raid (query: raid)
GET    /api/items/[id]             # Get item details
PATCH  /api/items/[id]             # Update item
DELETE /api/items/[id]             # Delete item
GET    /api/items/[id]/redemptions # Get token redemptions
POST   /api/items/[id]/redemptions # Add token redemption
DELETE /api/items/[id]/redemptions # Remove token redemption
GET    /api/items/[id]/sunmote-redemption  # Get sunmote upgrade
POST   /api/items/[id]/sunmote-redemption  # Link sunmote upgrade
DELETE /api/items/[id]/sunmote-redemption  # Remove sunmote link
GET    /api/items/search           # Search items (query: q, limit)
POST   /api/items/import           # Bulk import items
POST   /api/items/import-wowhead   # Import from Wowhead URL
POST   /api/items/import-csv       # Import from CSV
POST   /api/items/import-bosses    # Import boss data
GET    /api/items/export           # Export items
POST   /api/items/delete-all       # Delete all items
POST   /api/items/delete-batch     # Delete batch of items
POST   /api/items/fix-phases       # Fix phase data
POST   /api/items/refresh-icon     # Refresh item icon from Wowhead
POST   /api/items/sync-bis         # Sync BiS configurations
GET    /api/items/karazhan-needs   # Get Karazhan item needs by split
```

## Loot
```
GET    /api/loot                   # Get loot (query: teamId, history)
POST   /api/loot                   # Add loot record
GET    /api/loot/[id]              # Get loot record
PATCH  /api/loot/[id]              # Update loot record (assign player)
DELETE /api/loot/[id]              # Delete loot record
POST   /api/loot/import-rc         # Import from RCLootCouncil
POST   /api/loot/finalize-session  # Finalize current session
DELETE /api/loot/clear-session     # Clear current session
DELETE /api/loot/clear-unassigned  # Clear unassigned items only
```

## BiS Configuration
```
GET    /api/bis                    # Get BiS configurations
POST   /api/bis                    # Create BiS configuration
POST   /api/bis/import             # Import BiS list from Wowhead URL
GET    /api/bis/player             # Get player BiS configurations
```

## Attendance
```
GET    /api/attendance             # Get attendance records
POST   /api/attendance             # Record attendance
```

## Teams
```
GET    /api/teams                  # List teams
POST   /api/teams                  # Create team
```

## Splits (10-man Raids)
```
GET    /api/splits                 # Get raid splits
POST   /api/splits                 # Create/update splits
```

## Roster Assignments
```
GET    /api/roster-assignments     # Get roster assignments
POST   /api/roster-assignments     # Save roster assignments
```

## Performance
```
GET    /api/performance            # Get performance records
POST   /api/performance            # Create performance record
GET    /api/performance/[id]       # Get performance record
PATCH  /api/performance/[id]       # Update performance record
DELETE /api/performance/[id]       # Delete performance record
```

## Tokens & Sunmotes
```
GET    /api/tokens                 # Get token definitions
POST   /api/tokens/seed            # Seed token data
GET    /api/tokens/pieces          # Get token pieces
GET    /api/sunmotes               # Get sunmote definitions
POST   /api/sunmotes/seed          # Seed sunmote data
```

## Discord Integration
```
GET    /api/discord/members        # Get Discord server members
GET    /api/discord/roles          # Get Discord roles
GET    /api/discord/channels       # Get Discord channels
GET    /api/discord/feedback-channels # Get feedback channels
POST   /api/discord/create-feedback-channel # Create feedback channel
POST   /api/discord/archive-channel # Archive a channel
POST   /api/discord/send-message   # Send message to channel
POST   /api/discord/send-raid-embeds # Post raid roster embeds
POST   /api/discord/send-screenshot # Send screenshot to channel
POST   /api/discord/log-links      # Post log links
POST   /api/discord/cleanup        # Clean up Discord data
GET    /api/discord/user-role      # Get user's Discord role
```

## Raid Helper
```
GET    /api/raid-helper            # Get Raid Helper events
GET    /api/raid-helper/[eventId]/signups # Get event signups
```

## Admin
```
POST   /api/admin/clear-sessions   # Force logout all users (officers only)
```

## Health Check
```
GET    /api/health                 # Application health check
```

## Query Parameters

### Common Parameters
- `teamId` - Filter by team ID
- `limit` - Limit results
- `offset` - Pagination offset

### Loot Specific
- `history=true` - Get finalized loot history instead of current session

### Items Specific
- `raid` - Filter by raid name
- `phase` - Filter by phase (P1-P5)
- `q` - Search query

## Response Format

All endpoints return JSON. Successful responses return data directly or wrapped in an object:

```json
{
  "data": [...],
  "count": 100
}
```

Error responses follow the format:
```json
{
  "error": "Error message description"
}
```

## Authentication

Most endpoints require authentication via NextAuth session. Officer-level endpoints require the user to have `OFFICER` or `GUILD_MASTER` role.

Public endpoints:
- `/api/health`
- `/api/auth/*`

Authenticated endpoints check for valid session.

Officer-only endpoints:
- All POST/PATCH/DELETE on players, items, loot
- `/api/admin/*`
- Discord management endpoints
