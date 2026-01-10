interface AttendanceRecord {
  playerId: string;
  raidDate: Date;
  raidName: Raid;
  attended: boolean;
  fullyAttended: boolean; // Present for entire raid
}

interface PlayerAttendance {
  playerId: string;
  totalFullyAttended: number;
  totalAttended: number;
  totalRaidChances: number;
  missedRaids: number;
  attendancePercentage: number;
}