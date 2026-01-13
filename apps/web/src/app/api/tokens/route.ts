import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - List all tier tokens with linked pieces
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const tokenType = searchParams.get('tokenType');

    const tokens = await prisma.tierToken.findMany({
      where: {
        ...(tier && { tier }),
        ...(tokenType && { tokenType }),
      },
      include: {
        linkedPieces: {
          include: {
            pieceItem: {
              select: {
                id: true,
                name: true,
                wowheadId: true,
                icon: true,
                quality: true,
              },
            },
          },
          orderBy: { className: 'asc' },
        },
      },
      orderBy: [
        { tier: 'asc' },
        { slot: 'asc' },
        { tokenType: 'asc' },
      ],
    });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Failed to fetch tier tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier tokens' },
      { status: 500 }
    );
  }
}
