Loot Priority Calculation

function calculateLootPriority(player: Player, item: Item): number {
  let score = 0;
  
  // Base attendance weight (0-100)
  score += player.attendancePercentage * 0.3;
  
  // BiS priority (is this BiS for them?)
  if (item.bisCurrentPhase.includes(player.mainSpec)) {
    score += 50;
  } else if (item.bisNextPhase.includes(player.mainSpec)) {
    score += 30;
  }
  
  // Days since last item (more days = higher priority)
  score += Math.min(player.daysSinceLastItem * 2, 30);
  
  // Current BiS completion (lower = higher priority)
  score += (100 - player.bisPercentage) * 0.2;
  
  return score;
}


Attendance Calculation

function calculateAttendance(records: AttendanceRecord[]): number {
  const totalRaids = records.length;
  const attendedRaids = records.filter(r => r.attended).length;
  return totalRaids > 0 ? (attendedRaids / totalRaids) * 100 : 0;
}

Recommended Tech Stack

Frontend: React/Next.js with TypeScript, TailwindCSS
Backend: Node.js/Express or Next.js API routes
Database: PostgreSQL
Auth: Discord OAuth (common for WoW guilds)
Hosting: Vercel/Railway/Supabase