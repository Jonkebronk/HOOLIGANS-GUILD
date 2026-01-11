import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// POST - Approve application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reviewedById, officerNotes } = body;

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: reviewedById || undefined,
        officerNotes: officerNotes || undefined,
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true, discordName: true },
        },
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error('Failed to approve application:', error);
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}
