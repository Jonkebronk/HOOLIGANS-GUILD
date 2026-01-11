'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { refreshWowheadTooltips } from '@/lib/wowhead';

// Import TBC data and types from shared package
import {
  TbcItem,
  TbcEnchant,
  TbcGem,
  TbcGemColor,
  TBC_QUALITY_COLORS,
  TBC_GEM_COLORS,
  formatStats,
} from '@hooligans/shared';

// Import JSON data - these are static files
import tbcItemsData from '../../../../packages/shared/src/data/tbc-items.json';

// Cast JSON data to proper types
const tbcItems = tbcItemsData as TbcItem[];

interface GearPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: string;
  slotLabel: string;
  onSelectItem?: (item: TbcItem) => void;
  onSelectEnchant?: (enchant: TbcEnchant) => void;
  onSelectGem?: (gem: TbcGem, socketIndex: number) => void;
  onClear?: () => void;
  currentItem?: { id: number; name: string } | null;
  currentEnchant?: { id: number; name: string } | null;
  currentGems?: Array<{ id: number; name: string } | null>;
  gemSockets?: string[]; // ['Red', 'Blue', 'Meta'] etc
  playerClass?: string;
  armorType?: string;
}

// Map our slot names to TBC item slots
const slotMapping: Record<string, string[]> = {
  Head: ['Head'],
  Neck: ['Neck'],
  Shoulder: ['Shoulder'],
  Back: ['Back'],
  Chest: ['Chest'],
  Wrist: ['Wrist'],
  Hands: ['Hands'],
  Waist: ['Waist'],
  Legs: ['Legs'],
  Feet: ['Feet'],
  Finger1: ['Finger'],
  Finger2: ['Finger'],
  Trinket1: ['Trinket'],
  Trinket2: ['Trinket'],
  MainHand: ['Weapon'],
  OffHand: ['Weapon'],
  Ranged: ['Ranged'],
};

export function GearPickerModal({
  open,
  onOpenChange,
  slot,
  slotLabel,
  onSelectItem,
  onClear,
  currentItem,
  playerClass,
}: GearPickerModalProps) {
  const [phase, setPhase] = useState<string>('5');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
    }
  }, [open]);

  // Refresh tooltips when results change - give Wowhead time to inject icons
  useEffect(() => {
    if (open) {
      // Initial refresh
      refreshWowheadTooltips();
      // Additional refresh after DOM settles
      const timer = setTimeout(() => {
        refreshWowheadTooltips();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, phase, searchQuery]);

  // Get valid slot names for this gear slot
  const validSlots = slotMapping[slot] || [slot];

  // Filter items based on slot, phase, and search
  const filteredItems = useMemo(() => {
    const maxPhase = parseInt(phase);
    let items = tbcItems.filter((item) => {
      // Filter by slot
      if (!validSlots.includes(item.slot)) return false;

      // Filter by phase
      if (item.phase > maxPhase) return false;

      // Filter by class if specified
      if (item.classAllowlist && playerClass) {
        if (!item.classAllowlist.includes(playerClass as never)) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });

    // Sort by phase desc, then ilvl desc, then quality
    items.sort((a, b) => {
      // First by phase (descending)
      if ((b.phase || 0) !== (a.phase || 0)) {
        return (b.phase || 0) - (a.phase || 0);
      }
      // Then by ilvl (descending)
      if ((b.ilvl || 0) !== (a.ilvl || 0)) {
        return (b.ilvl || 0) - (a.ilvl || 0);
      }
      // Then by quality (epic > rare > uncommon)
      const qualityOrder = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    return items.slice(0, 50); // Limit results
  }, [validSlots, phase, searchQuery, playerClass]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Select {slotLabel}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Phase 1</SelectItem>
              <SelectItem value="2">Phase 2</SelectItem>
              <SelectItem value="3">Phase 3</SelectItem>
              <SelectItem value="4">Phase 4</SelectItem>
              <SelectItem value="5">Phase 5</SelectItem>
            </SelectContent>
          </Select>
          {currentItem && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Content - Items only */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[400px]">
          <div className="space-y-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items found for this slot
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectItem?.(item);
                    onOpenChange(false);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    currentItem?.id === item.id
                      ? 'bg-primary/20 border border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Single Wowhead link - icon will be injected by Wowhead */}
                  <a
                    href={`https://www.wowhead.com/tbc/item=${item.id}`}
                    onClick={(e) => e.preventDefault()}
                    data-wh-icon-size="medium"
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {/* Item name and stats - Wowhead will prepend icon */}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span
                          className="font-medium truncate"
                          style={{ color: TBC_QUALITY_COLORS[item.quality] || '#a335ee' }}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          P{item.phase}
                        </span>
                        {item.ilvl && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            iLvl {item.ilvl}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {formatStats(item.stats)}
                      </span>
                      {item.gemSockets && item.gemSockets.length > 0 && (
                        <span className="flex items-center gap-1 mt-1">
                          {item.gemSockets.map((socket, idx) => (
                            <span
                              key={idx}
                              className="w-3 h-3 rounded-sm inline-block"
                              style={{
                                backgroundColor: TBC_GEM_COLORS[socket as TbcGemColor] || '#888',
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
