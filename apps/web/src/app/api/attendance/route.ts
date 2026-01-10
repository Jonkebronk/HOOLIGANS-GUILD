import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    // Get all players with their attendance records
    const players = await prisma.player.findMany({
      where: { active: true },
      include: {
        attendance: {
          orderBy: { raidDate: 'desc' },
        },
      },
    });

    // Calculate attendance stats per player
    const playersWithStats = players.map(player => {
      const totalRaids = player.attendance.length;
      const attendedRaids = player.attendance.filter(a => a.attended).length;
      const attendancePercent = totalRaids > 0 ? Math.round((attendedRaids / totalRaids) * 100) : 0;

      return {
        ...player,
        totalRaids,
        attendedRaids,
        attendancePercent,
      };
    });

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, raidDate, raidName, attended, fullyAttended } = body;

    const record = await prisma.attendanceRecord.create({
      data: {
        playerId,
        raidDate: new Date(raidDate),
        raidName,
        attended,
        fullyAttended,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Failed to create attendance record:', error);
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 });
  }
}
