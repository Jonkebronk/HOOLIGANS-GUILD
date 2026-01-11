import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raidsOnly = searchParams.get('raids') === 'true';
    const teamId = searchParams.get('teamId');

    // Return unique raids list
    if (raidsOnly) {
      const raids = await prisma.attendanceRecord.findMany({
        where: teamId ? { teamId } : undefined,
        select: {
          raidDate: true,
          raidName: true,
        },
        distinct: ['raidDate', 'raidName'],
        orderBy: { raidDate: 'desc' },
      });

      // Group by date and raid name
      const uniqueRaids = raids.map(r => ({
        date: r.raidDate.toISOString().split('T')[0],
        name: r.raidName,
        key: `${r.raidDate.toISOString().split('T')[0]}-${r.raidName}`,
      }));

      return NextResponse.json(uniqueRaids);
    }

    // Get all players with their attendance records
    const players = await prisma.player.findMany({
      where: {
        active: true,
        ...(teamId && { teamId }),
      },
      include: {
        attendance: {
          where: teamId ? { teamId } : undefined,
          orderBy: { raidDate: 'desc' },
        },
      },
    });

    // Get all unique raid dates to calculate total raids
    const allRaids = await prisma.attendanceRecord.findMany({
      where: teamId ? { teamId } : undefined,
      select: { raidDate: true, raidName: true },
      distinct: ['raidDate', 'raidName'],
    });
    const totalRaidsInSystem = allRaids.length;

    // Calculate attendance stats per player
    const playersWithStats = players.map(player => {
      const attendedRaids = player.attendance.filter(a => a.attended).length;
      const attendancePercent = totalRaidsInSystem > 0 ? Math.round((attendedRaids / totalRaidsInSystem) * 100) : 0;

      return {
        ...player,
        totalRaids: totalRaidsInSystem,
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

    // Bulk import mode - create attendance for multiple players at once
    if (body.bulk && Array.isArray(body.playerIds)) {
      const { playerIds, raidDate, raidName, attended = true, fullyAttended = false, teamId } = body;

      // Use upsert to avoid duplicates
      const results = await Promise.all(
        playerIds.map((playerId: string) =>
          prisma.attendanceRecord.upsert({
            where: {
              playerId_raidDate_raidName: {
                playerId,
                raidDate: new Date(raidDate),
                raidName,
              },
            },
            update: { attended, fullyAttended },
            create: {
              playerId,
              raidDate: new Date(raidDate),
              raidName,
              attended,
              fullyAttended,
              ...(teamId && { teamId }),
            },
          })
        )
      );

      return NextResponse.json({ created: results.length, records: results }, { status: 201 });
    }

    // Single record mode
    const { playerId, raidDate, raidName, attended, fullyAttended, teamId } = body;

    const record = await prisma.attendanceRecord.upsert({
      where: {
        playerId_raidDate_raidName: {
          playerId,
          raidDate: new Date(raidDate),
          raidName,
        },
      },
      update: { attended, fullyAttended },
      create: {
        playerId,
        raidDate: new Date(raidDate),
        raidName,
        attended,
        fullyAttended,
        ...(teamId && { teamId }),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Failed to create attendance record:', error);
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    const playerId = searchParams.get('playerId');
    const raidDate = searchParams.get('raidDate');
    const raidName = searchParams.get('raidName');

    // Delete by record ID
    if (recordId) {
      await prisma.attendanceRecord.delete({
        where: { id: recordId },
      });
      return NextResponse.json({ deleted: true });
    }

    // Delete by player + raid combo
    if (playerId && raidDate && raidName) {
      await prisma.attendanceRecord.delete({
        where: {
          playerId_raidDate_raidName: {
            playerId,
            raidDate: new Date(raidDate),
            raidName,
          },
        },
      });
      return NextResponse.json({ deleted: true });
    }

    // Delete entire raid (all attendance records for a date + raid)
    if (raidDate && raidName && !playerId) {
      const teamId = searchParams.get('teamId');
      const result = await prisma.attendanceRecord.deleteMany({
        where: {
          raidDate: new Date(raidDate),
          raidName,
          ...(teamId && { teamId }),
        },
      });
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete attendance record:', error);
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
}
