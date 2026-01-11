import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// GET - List applications (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');
    const classFilter = searchParams.get('class');

    const where: Record<string, unknown> = {};

    if (teamId) where.teamId = teamId;
    if (status) where.status = status;
    if (classFilter) where.class = classFilter;

    const applications = await prisma.application.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true, discordName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

// POST - Submit new application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      teamId,
      discordId,
      discordName,
      inGameName,
      characterName,
      realm,
      class: wowClass,
      mainSpec,
      offSpec,
      professions,
      warcraftLogsUrl,
      raidExperience,
      availability,
      uiScreenshot,
      gearScreenshot,
      additionalInfo,
      // Optional cached WCL data
      wclBestPerf,
      wclMedianPerf,
      wclParseCount,
    } = body;

    // Validate required fields
    if (!teamId || !discordId || !discordName || !characterName || !wowClass || !mainSpec) {
      return NextResponse.json(
        { error: 'Missing required fields: teamId, discordId, discordName, characterName, class, mainSpec' },
        { status: 400 }
      );
    }

    // Check for existing pending application from same Discord user for same team
    const existingApplication = await prisma.application.findFirst({
      where: {
        teamId,
        discordId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You already have a pending application for this team' },
        { status: 409 }
      );
    }

    const application = await prisma.application.create({
      data: {
        teamId,
        discordId,
        discordName,
        inGameName: inGameName || characterName,
        characterName,
        realm,
        class: wowClass,
        mainSpec,
        offSpec,
        professions,
        warcraftLogsUrl,
        raidExperience,
        availability: availability || false,
        uiScreenshot,
        gearScreenshot,
        additionalInfo,
        wclBestPerf,
        wclMedianPerf,
        wclParseCount,
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Failed to create application:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
