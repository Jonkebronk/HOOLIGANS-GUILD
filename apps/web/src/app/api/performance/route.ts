import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const performances = await prisma.raidPerformance.findMany({
      where: teamId ? { teamId } : undefined,
      include: {
        feedbackChannels: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                class: true,
              },
            },
          },
        },
      },
      orderBy: { raidDate: 'desc' },
    });

    return NextResponse.json(performances);
  } catch (error) {
    console.error('Failed to fetch performances:', error);
    return NextResponse.json({ error: 'Failed to fetch performances' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamId, raidDate, raidName, wclUrl, raidHelperId, googleSheetUrl, notes } = body;

    if (!teamId || !raidDate || !raidName) {
      return NextResponse.json(
        { error: 'teamId, raidDate, and raidName are required' },
        { status: 400 }
      );
    }

    const performance = await prisma.raidPerformance.create({
      data: {
        teamId,
        raidDate: new Date(raidDate),
        raidName,
        wclUrl,
        raidHelperId,
        googleSheetUrl,
        notes,
      },
      include: {
        feedbackChannels: true,
      },
    });

    return NextResponse.json(performance, { status: 201 });
  } catch (error) {
    console.error('Failed to create performance:', error);
    return NextResponse.json({ error: 'Failed to create performance' }, { status: 500 });
  }
}
