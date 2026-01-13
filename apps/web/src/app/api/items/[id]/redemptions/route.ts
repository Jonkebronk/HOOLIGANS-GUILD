import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - Get all redemptions for a token item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const redemptions = await prisma.tokenRedemption.findMany({
      where: { tokenItemId: id },
      include: {
        redemptionItem: {
          include: {
            lootRecords: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    class: true,
                  },
                },
              },
              orderBy: { lootDate: 'desc' },
              take: 5,
            },
          },
        },
      },
      orderBy: { className: 'asc' },
    });

    return NextResponse.json(redemptions);
  } catch (error) {
    console.error('Failed to fetch redemptions:', error);
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}

// POST - Add a redemption item to a token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { redemptionItemId, className } = body;

    if (!redemptionItemId || !className) {
      return NextResponse.json(
        { error: 'redemptionItemId and className are required' },
        { status: 400 }
      );
    }

    // Check if token item exists
    const tokenItem = await prisma.item.findUnique({ where: { id } });
    if (!tokenItem) {
      return NextResponse.json({ error: 'Token item not found' }, { status: 404 });
    }

    // Check if redemption item exists
    const redemptionItem = await prisma.item.findUnique({ where: { id: redemptionItemId } });
    if (!redemptionItem) {
      return NextResponse.json({ error: 'Redemption item not found' }, { status: 404 });
    }

    // Create the redemption link
    const redemption = await prisma.tokenRedemption.create({
      data: {
        tokenItemId: id,
        redemptionItemId,
        className,
      },
      include: {
        redemptionItem: {
          include: {
            lootRecords: {
              include: {
                player: {
                  select: {
                    id: true,
                    name: true,
                    class: true,
                  },
                },
              },
              orderBy: { lootDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    return NextResponse.json(redemption);
  } catch (error) {
    console.error('Failed to create redemption:', error);
    return NextResponse.json({ error: 'Failed to create redemption' }, { status: 500 });
  }
}

// DELETE - Remove a redemption item from a token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const redemptionId = searchParams.get('redemptionId');

    if (!redemptionId) {
      return NextResponse.json({ error: 'redemptionId query param is required' }, { status: 400 });
    }

    // Delete the redemption
    await prisma.tokenRedemption.delete({
      where: { id: redemptionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete redemption:', error);
    return NextResponse.json({ error: 'Failed to delete redemption' }, { status: 500 });
  }
}
