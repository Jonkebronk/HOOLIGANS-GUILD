'use client';

import { useEffect } from 'react';
import { refreshWowheadTooltips } from '@/lib/wowhead';

export function useWowhead(deps: unknown[] = []) {
  useEffect(() => {
    refreshWowheadTooltips();
  }, deps);
}
