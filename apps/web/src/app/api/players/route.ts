import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(players);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, wowClass, mainSpec, offSpec, role, roleSubtype, notes, discordId } = body;

    const player = await prisma.player.create({
      data: {
        name,
        class: wowClass,
        mainSpec,
        offSpec,
        role,
        roleSubtype,
        notes,
        discordId,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
