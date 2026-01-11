import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const performance = await prisma.raidPerformance.findUnique({
      where: { id },
      include: {
        feedbackChannels: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                class: true,
                discordId: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!performance) {
      return NextResponse.json({ error: 'Performance not found' }, { status: 404 });
    }

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Failed to fetch performance:', error);
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { raidDate, raidName, wclUrl, raidHelperId, googleSheetUrl, notes } = body;

    const performance = await prisma.raidPerformance.update({
      where: { id },
      data: {
        ...(raidDate && { raidDate: new Date(raidDate) }),
        ...(raidName !== undefined && { raidName }),
        ...(wclUrl !== undefined && { wclUrl }),
        ...(raidHelperId !== undefined && { raidHelperId }),
        ...(googleSheetUrl !== undefined && { googleSheetUrl }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        feedbackChannels: true,
      },
    });

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Failed to update performance:', error);
    return NextResponse.json({ error: 'Failed to update performance' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.raidPerformance.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete performance:', error);
    return NextResponse.json({ error: 'Failed to delete performance' }, { status: 500 });
  }
}
