import { NextResponse } from 'next/server';
import { prisma } from '@hooligans/database';

// POST - Assign a consumable to a spec/category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consumableId, spec, category, priority, sortOrder = 0 } = body;

    if (!consumableId || !spec || !category || !priority) {
      return NextResponse.json(
        { error: 'consumableId, spec, category, and priority are required' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!['best', 'alternative'].includes(priority)) {
      return NextResponse.json(
        { error: 'priority must be "best" or "alternative"' },
        { status: 400 }
      );
    }

    // Upsert the config
    const config = await prisma.consumableSpecConfig.upsert({
      where: {
        consumableId_spec_category: {
          consumableId,
          spec,
          category,
        },
      },
      update: {
        priority,
        sortOrder,
      },
      create: {
        consumableId,
        spec,
        category,
        priority,
        sortOrder,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to save consumable config:', error);
    return NextResponse.json(
      { error: 'Failed to save consumable config' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a consumable from a spec/category
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consumableId = searchParams.get('consumableId');
    const spec = searchParams.get('spec');
    const category = searchParams.get('category');

    if (!consumableId || !spec || !category) {
      return NextResponse.json(
        { error: 'consumableId, spec, and category are required' },
        { status: 400 }
      );
    }

    await prisma.consumableSpecConfig.delete({
      where: {
        consumableId_spec_category: {
          consumableId,
          spec,
          category,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete consumable config:', error);
    return NextResponse.json(
      { error: 'Failed to delete consumable config' },
      { status: 500 }
    );
  }
}
