# UI Components

## Page Structure

### Dashboard (`/dashboard`)
- Guild overview with stats cards
- Raid schedule (Karazhan overview)
- Leadership cards with Discord links
- Loot council rules
- "Ready to Pump" preparation card
- Addon download links

### Roster (`/dashboard/roster`)
- Sortable player table with all columns
- Inline editing for player details
- Class/spec/role filtering
- Discord member import dialog
- Player creation/edit dialog
- Bulk operations

### Drops (`/dashboard/loot`)
- Two-column layout: Items + Raiders
- Items table with:
  - Expandable token rows (showing redemption items)
  - Expandable sunmote rows (showing upgrades)
  - BiS/BiS Next indicators with player names
  - Player assignment dropdown
  - Response type selector
  - Delete action
- Raiders table with:
  - Sortable columns (LTR, Total, Days)
  - Class-colored names
  - Compact layout
- Action buttons:
  - Add Item (search from database)
  - RC Import/Export dialogs
  - RC Guide help dialog
  - Finalize Session / Clear All
- Loot council criteria bar

### Items (`/dashboard/items`)
- Filterable item grid by raid/phase/slot
- Item cards with Wowhead tooltips
- Token/Sunmote badges
- Item details dialog:
  - Edit item properties
  - Manage BiS specs
  - Token redemption management
  - Sunmote upgrade linking
- Import dialogs (Wowhead, CSV)
- Search functionality

### BiS Configuration (`/dashboard/bis`)
- Player selector
- Phase toggle (P1, P2, etc.)
- Gear slot grid with item icons
- Wowhead URL import
- Completion percentage display
- Current vs next phase comparison

### Attendance (`/dashboard/attendance`)
- Raid calendar view
- Player attendance grid
- Percentage calculations
- Raid Helper event integration
- Bulk attendance recording

### Splits (`/dashboard/splits`)
- Split selector (Split 1, 2, 3, etc.)
- Drag-and-drop player assignment
- Role distribution display
- Auto-balance button
- Discord posting integration
- Screenshot capture
- Soft-res URL generation

### Karazhan Overview (`/dashboard/splits/karazhan`)
- Three-split overview
- Per-split item needs
- Compact roster display
- Quick navigation

### Performance (`/dashboard/performance`)
- Player list with ratings
- Performance notes
- Star rating system
- Historical view

### Loot History (`/dashboard/loot-history`)
- Filterable loot history
- Search by player/item
- Date range filtering
- Phase filtering

### Reports (`/dashboard/reports`)
- Loot distribution charts
- Per-player summaries
- Date range selection

## Shared Components

### Layout
- `Sidebar` - Navigation menu with role-based visibility
- `Header` - User info, team selector, logout
- `TeamProvider` - Team context for data filtering

### UI Components (shadcn/ui)
- `Button` - Various variants (default, outline, ghost)
- `Card` - Content containers
- `Dialog` - Modal dialogs
- `Select` - Dropdowns with search
- `Input` - Text inputs
- `Table` - Data tables
- `Tabs` - Tab navigation
- `Toast` - Notifications
- `Tooltip` - Hover tooltips
- `Badge` - Status badges
- `Avatar` - Player/user avatars
- `Checkbox` - Selection controls
- `Switch` - Toggle controls

### Custom Components
- `ItemsTable` - Loot items with expandable rows
- `RaidersTable` - Compact raider stats
- `RCImportDialog` - RCLootCouncil import
- `RCExportDialog` - RCLootCouncil export
- `PlayerSelector` - Player dropdown with class colors
- `ItemIcon` - Wowhead item icon with quality border
- `ClassIcon` - WoW class icons
- `SplitRoster` - Raid split display
- `KarazhanOverview` - Karazhan split summary

## Color Scheme

### WoW Class Colors
```css
:root {
  --druid: #FF7C0A;
  --hunter: #AAD372;
  --mage: #3FC7EB;
  --paladin: #F48CBA;
  --priest: #FFFFFF;
  --rogue: #FFF468;
  --shaman: #0070DD;
  --warlock: #8788EE;
  --warrior: #C69B6D;
}
```

### Item Quality Colors
```css
:root {
  --quality-poor: #9d9d9d;
  --quality-common: #ffffff;
  --quality-uncommon: #1eff00;
  --quality-rare: #0070dd;
  --quality-epic: #a335ee;
  --quality-legendary: #ff8000;
}
```

### Theme Colors (Dark Mode)
```css
:root {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --card: #0a0a0a;
  --card-foreground: #fafafa;
  --primary: #fafafa;
  --primary-foreground: #171717;
  --secondary: #262626;
  --muted: #262626;
  --muted-foreground: #a1a1aa;
  --accent: #262626;
  --border: #262626;
}
```

## Responsive Design

- Desktop-first design
- Minimum supported width: 1280px
- Two-column layouts collapse on smaller screens
- Tables scroll horizontally on mobile
- Dialog content scrollable with max-height

## Accessibility

- Keyboard navigation support
- Focus indicators
- Screen reader labels
- Color contrast compliance
- ARIA attributes on interactive elements
