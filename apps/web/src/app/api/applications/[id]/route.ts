import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - Get single application with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true, discordName: true },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error('Failed to fetch application:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

// PATCH - Update application (status, notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      officerNotes,
      reviewedById,
      // Allow updating WCL cached data
      wclBestPerf,
      wclMedianPerf,
      wclParseCount,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
      // Set reviewedAt when status changes from PENDING
      if (status !== 'PENDING') {
        updateData.reviewedAt = new Date();
      }
    }

    if (officerNotes !== undefined) updateData.officerNotes = officerNotes;
    if (reviewedById !== undefined) updateData.reviewedById = reviewedById;
    if (wclBestPerf !== undefined) updateData.wclBestPerf = wclBestPerf;
    if (wclMedianPerf !== undefined) updateData.wclMedianPerf = wclMedianPerf;
    if (wclParseCount !== undefined) updateData.wclParseCount = wclParseCount;

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
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
    console.error('Failed to update application:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

// DELETE - Delete application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.application.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete application:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
