# Features Status

## Implemented Features

### 1. Dashboard
- [x] Guild overview with quick stats
- [x] Raid schedule display (Karazhan overview)
- [x] Leadership cards with Discord links
- [x] Loot council rules display
- [x] Quick links to addon downloads
- [x] "Ready to Pump" raid preparation card
- [x] Soft-res URL feature for PuG raids

### 2. Roster Management
- [x] CRUD operations for players
- [x] Class/spec assignment with all TBC specs
- [x] Notes field for special loot rules
- [x] Active/inactive status toggle
- [x] Role assignment (Tank/Heal/DPS with subtypes)
- [x] Raid team assignment
- [x] Discord member import
- [x] Sortable table headers
- [x] Filtering by class/role/team

### 3. Item Database
- [x] Master list of all items by raid/boss/phase
- [x] BiS designation per spec (current and next phase)
- [x] Loot priority configuration
- [x] Wowhead integration for icons and tooltips
- [x] Token system with class-specific redemptions
- [x] Sunmote upgrade system
- [x] Import from Wowhead URLs
- [x] CSV import support
- [x] Phase filtering (P1-P5)
- [x] Item search functionality
- [x] Token/Sunmote badges in item list

### 4. Loot Tracking (Drops Page)
- [x] Real-time loot entry during raids
- [x] Item assignment with player dropdown
- [x] BiS indicator for current and next phase
- [x] RCLootCouncil import/export
- [x] Session management (finalize/clear)
- [x] Expandable rows for tokens (showing redemption items)
- [x] Expandable rows for sunmote items (showing upgrades)
- [x] Raiders stats table with LTR/Total/Days since last
- [x] Instant BiS updates on assign/unassign
- [x] RC Guide help dialog
- [x] Loot council criteria display

### 5. RCLootCouncil Integration
- [x] Parse RC export data format
- [x] Map imported data to internal records
- [x] Bulk import loot data
- [x] Export to RC format for in-game import
- [x] Session management for raid imports

### 6. BiS Configuration
- [x] Per-player BiS list management
- [x] Import from Wowhead (Seventyupgrades URLs)
- [x] Current phase and next phase tracking
- [x] BiS completion percentage display
- [x] Visual gear slot grid
- [x] Automatic item matching from database

### 7. Attendance System
- [x] Raid attendance recording
- [x] Percentage calculations
- [x] Historical attendance view
- [x] Per-player attendance display
- [x] Raid Helper integration (event signups)

### 8. 10-Man Split Manager
- [x] Auto-balance raid compositions
- [x] Role distribution optimization
- [x] Drag-and-drop player assignment
- [x] Per-split item need analysis
- [x] Discord integration for posting rosters
- [x] Screenshot capture for Discord
- [x] Soft-res URL generation
- [x] Karazhan-specific overview page

### 9. Performance Tracking
- [x] Per-player performance notes
- [x] Rating system (1-5 stars)
- [x] Comments and feedback
- [x] Historical performance view

### 10. Loot History
- [x] Complete loot history with filtering
- [x] Search by player/item
- [x] Phase filtering
- [x] Date range filtering

### 11. Reports
- [x] Loot distribution analytics
- [x] Per-player loot summary
- [x] Filtering by date range

### 12. Discord Integration
- [x] Discord OAuth authentication
- [x] Bot for roster posting with embeds
- [x] Channel management (create/archive feedback channels)
- [x] Member import to roster
- [x] Screenshot posting to channels
- [x] Role-based access control sync
- [x] Log links posting

### 13. Authentication & Authorization
- [x] Discord OAuth login
- [x] Role-based permissions (Member, Raider, Officer, GM)
- [x] Team-based access control
- [x] Session management with auto-cleanup
- [x] Admin session clear endpoint

## Pending/Future Features

### Gear Chasing View
- [ ] Show which items each player needs
- [ ] Filter by raid instance
- [ ] Display BiS needs grouped by boss

### Raid Quest Tracking
- [ ] Track quest item turn-ins (Magtheridon's Head, Verdant Sphere, etc.)
- [ ] Show reward choices per class
- [ ] Progress tracking per player

### Enhanced Analytics
- [ ] Attendance trends over time
- [ ] BiS completion rates by role
- [ ] Loot equity metrics
- [ ] Guild progression tracking

### Quality of Life
- [ ] Mobile-responsive optimizations
- [ ] Dark/light theme toggle
- [ ] Notification system
- [ ] Email notifications for loot assignments

## Technical Debt / Improvements

- [ ] Add comprehensive test coverage
- [ ] Implement API rate limiting
- [ ] Add request logging/monitoring
- [ ] Optimize database queries with indices
- [ ] Add API documentation (OpenAPI/Swagger)
