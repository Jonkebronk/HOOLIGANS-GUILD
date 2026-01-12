import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    // Get all feedback channels, optionally filtered by team
    const channels = await prisma.feedbackChannel.findMany({
      where: teamId
        ? {
            player: {
              teamId,
            },
          }
        : undefined,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Failed to fetch feedback channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback channels' },
      { status: 500 }
    );
  }
}
