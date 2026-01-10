// Players
GET    /api/players
POST   /api/players
PUT    /api/players/:id
DELETE /api/players/:id
GET    /api/players/:id/loot-history
GET    /api/players/:id/attendance
GET    /api/players/:id/bis-status

// Items
GET    /api/items
GET    /api/items/by-raid/:raid
GET    /api/items/by-slot/:slot
GET    /api/items/:id/who-needs

// Loot
POST   /api/loot/record
GET    /api/loot/history
POST   /api/loot/import-rc
GET    /api/loot/session/:sessionId

// Attendance
POST   /api/attendance/record
GET    /api/attendance/by-player/:playerId
GET    /api/attendance/by-date/:date
POST   /api/attendance/bulk-record

// Raids
GET    /api/raids/splits
PUT    /api/raids/splits/:id
POST   /api/raids/auto-balance

// BiS
GET    /api/bis/configuration/:spec/:phase
PUT    /api/bis/configuration/:spec/:phase
GET    /api/bis/gear-chasing/:raid

// Reports
GET    /api/reports/loot-distribution
GET    /api/reports/attendance-summary
GET    /api/reports/bis-completion