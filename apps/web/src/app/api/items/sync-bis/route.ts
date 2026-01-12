import { NextResponse } from 'next/server';
import { prisma, Phase } from '@hooligans/database';
import { SPEC_SHORT_NAMES } from '@/lib/specs';

// Current phase - P1 for now
const CURRENT_PHASE: Phase = 'P1';
const NEXT_PHASE: Phase = 'P2';

// Get short name for a spec
function getShortName(specId: string): string {
  return SPEC_SHORT_NAMES[specId] || specId;
}

// POST /api/items/sync-bis - Sync all items' bisFor/bisNextPhase from BiS presets
export async function POST() {
  try {
    // 1. Get all BiS configurations for current and next phase
    const bisConfigs = await prisma.bisConfiguration.findMany({
      where: {
        phase: { in: [CURRENT_PHASE, NEXT_PHASE] },
        wowheadId: { not: null },
      },
      select: {
        spec: true,
        phase: true,
        wowheadId: true,
      },
    });

    // 2. Group by wowheadId
    const itemBisMap = new Map<number, { currentPhase: Set<string>; nextPhase: Set<string> }>();

    for (const config of bisConfigs) {
      if (!config.wowheadId) continue;

      if (!itemBisMap.has(config.wowheadId)) {
        itemBisMap.set(config.wowheadId, { currentPhase: new Set(), nextPhase: new Set() });
      }

      const entry = itemBisMap.get(config.wowheadId)!;
      const shortName = getShortName(config.spec);

      if (config.phase === CURRENT_PHASE) {
        entry.currentPhase.add(shortName);
      } else if (config.phase === NEXT_PHASE) {
        entry.nextPhase.add(shortName);
      }
    }

    // 3. Update items
    let updatedCount = 0;
    const errors: string[] = [];

    for (const [wowheadId, specs] of itemBisMap) {
      const bisFor = Array.from(specs.currentPhase).sort().join(', ') || null;
      const bisNextPhase = Array.from(specs.nextPhase).sort().join(', ') || null;

      try {
        const result = await prisma.item.updateMany({
          where: { wowheadId },
          data: { bisFor, bisNextPhase },
        });
        updatedCount += result.count;
      } catch (err) {
        errors.push(`Failed to update item with wowheadId ${wowheadId}: ${err}`);
      }
    }

    // 4. Clear bisFor/bisNextPhase for items NOT in any BiS list
    const wowheadIdsInBis = Array.from(itemBisMap.keys());
    if (wowheadIdsInBis.length > 0) {
      await prisma.item.updateMany({
        where: {
          wowheadId: { notIn: wowheadIdsInBis },
          OR: [
            { bisFor: { not: null } },
            { bisNextPhase: { not: null } },
          ],
        },
        data: { bisFor: null, bisNextPhase: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Synced BiS data for ${updatedCount} items from ${bisConfigs.length} BiS configurations`,
      updatedCount,
      configCount: bisConfigs.length,
      uniqueItems: itemBisMap.size,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to sync BiS:', error);
    return NextResponse.json(
      { error: 'Failed to sync BiS data', details: String(error) },
      { status: 500 }
    );
  }
}
