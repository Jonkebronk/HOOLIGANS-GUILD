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
import { Search, X, Gem, Sparkles, Swords } from 'lucide-react';
import { getItemIconUrl, refreshWowheadTooltips } from '@/lib/wowhead';

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
import tbcEnchantsData from '../../../../packages/shared/src/data/tbc-enchants.json';
import tbcGemsData from '../../../../packages/shared/src/data/tbc-gems.json';

// Cast JSON data to proper types
const tbcItems = tbcItemsData as TbcItem[];
const tbcEnchants = tbcEnchantsData as TbcEnchant[];
const tbcGems = tbcGemsData as TbcGem[];

type PickerTab = 'items' | 'enchants' | 'gem-red' | 'gem-blue' | 'gem-yellow' | 'gem-meta';

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

// Map gem socket colors to filter values
const gemColorToFilter: Record<string, TbcGemColor[]> = {
  'gem-red': ['Red', 'Orange', 'Purple'], // Red socket accepts Red, Orange, Purple
  'gem-blue': ['Blue', 'Green', 'Purple'], // Blue socket accepts Blue, Green, Purple
  'gem-yellow': ['Yellow', 'Orange', 'Green'], // Yellow socket accepts Yellow, Orange, Green
  'gem-meta': ['Meta'], // Meta socket only accepts Meta
};

export function GearPickerModal({
  open,
  onOpenChange,
  slot,
  slotLabel,
  onSelectItem,
  onSelectEnchant,
  onSelectGem,
  onClear,
  currentItem,
  currentEnchant,
  currentGems = [],
  gemSockets = [],
  playerClass,
  armorType,
}: GearPickerModalProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('items');
  const [phase, setPhase] = useState<string>('5');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGemSocket, setSelectedGemSocket] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('items');
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
  }, [open, activeTab, phase, searchQuery]);

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

  // Filter enchants based on slot and phase
  const filteredEnchants = useMemo(() => {
    const maxPhase = parseInt(phase);
    let enchants = tbcEnchants.filter((enchant) => {
      // Filter by slot
      if (!validSlots.includes(enchant.slot)) return false;

      // Filter by phase
      if (enchant.phase > maxPhase) return false;

      // Filter by class if specified
      if (enchant.classAllowlist && playerClass) {
        if (!enchant.classAllowlist.includes(playerClass as never)) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!enchant.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });

    // Sort by phase desc
    enchants.sort((a, b) => (b.phase || 0) - (a.phase || 0));

    return enchants;
  }, [validSlots, phase, searchQuery, playerClass]);

  // Filter gems based on socket color and phase
  const filteredGems = useMemo(() => {
    const maxPhase = parseInt(phase);
    const validColors = gemColorToFilter[activeTab] || [];

    if (validColors.length === 0) return [];

    let gems = tbcGems.filter((gem) => {
      // Filter by color (gems that fit this socket)
      if (!validColors.includes(gem.color)) {
        // Prismatic gems fit any socket
        if (gem.color !== 'Prismatic') return false;
      }

      // Filter by phase
      if (gem.phase > maxPhase) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!gem.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });

    // Sort by phase desc, then quality
    gems.sort((a, b) => {
      if ((b.phase || 0) !== (a.phase || 0)) {
        return (b.phase || 0) - (a.phase || 0);
      }
      const qualityOrder = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    return gems;
  }, [activeTab, phase, searchQuery]);

  // Always show all gem tabs so users can browse gems
  // Head slot typically has meta socket, other slots have colored sockets
  const availableGemTabs: PickerTab[] = useMemo(() => {
    // Show meta for head slot, colored gems for other slots
    if (slot === 'Head') {
      return ['gem-meta', 'gem-red', 'gem-blue', 'gem-yellow'];
    }
    return ['gem-red', 'gem-blue', 'gem-yellow'];
  }, [slot]);

  const renderTabButton = (
    tab: PickerTab,
    label: string,
    icon: React.ReactNode,
    color?: string
  ) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
        activeTab === tab
          ? 'bg-muted text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
      style={{ color: activeTab === tab ? color : undefined }}
    >
      {icon}
      {label}
    </button>
  );

  const renderGemSocketIcon = (color: string, size = 16) => (
    <div
      className="rounded-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: TBC_GEM_COLORS[color as TbcGemColor] || '#888',
        boxShadow: `0 0 4px ${TBC_GEM_COLORS[color as TbcGemColor] || '#888'}`,
      }}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Select {slotLabel}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-border">
          {renderTabButton('items', 'Items', <Swords className="h-4 w-4" />)}
          {renderTabButton('enchants', 'Enchants', <Sparkles className="h-4 w-4" />)}
          {availableGemTabs.includes('gem-red') &&
            renderTabButton('gem-red', '', renderGemSocketIcon('Red'), '#ff4444')}
          {availableGemTabs.includes('gem-blue') &&
            renderTabButton('gem-blue', '', renderGemSocketIcon('Blue'), '#4444ff')}
          {availableGemTabs.includes('gem-yellow') &&
            renderTabButton('gem-yellow', '', renderGemSocketIcon('Yellow'), '#ffff00')}
          {availableGemTabs.includes('gem-meta') &&
            renderTabButton('gem-meta', 'Meta', <Gem className="h-4 w-4" />, '#888888')}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
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
          {(currentItem || currentEnchant || currentGems.some(g => g)) && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[400px]">
          {activeTab === 'items' && (
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
                    <a
                      href={`https://www.wowhead.com/tbc/item=${item.id}`}
                      onClick={(e) => e.preventDefault()}
                      className="flex-shrink-0"
                      style={{
                        borderRadius: 4,
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: TBC_QUALITY_COLORS[item.quality] || '#a335ee',
                      }}
                    ></a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatStats(item.stats)}
                      </div>
                      {item.gemSockets && item.gemSockets.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {item.gemSockets.map((socket, idx) => (
                            <div
                              key={idx}
                              className="w-3 h-3 rounded-sm"
                              style={{
                                backgroundColor: TBC_GEM_COLORS[socket as TbcGemColor] || '#888',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'enchants' && (
            <div className="space-y-1">
              {filteredEnchants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No enchants found for this slot
                </div>
              ) : (
                filteredEnchants.map((enchant) => (
                  <div
                    key={enchant.id}
                    onClick={() => {
                      onSelectEnchant?.(enchant);
                      onOpenChange(false);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentEnchant?.id === enchant.id
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(163, 53, 238, 0.2)',
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: TBC_QUALITY_COLORS[enchant.quality] || '#1eff00',
                      }}
                    >
                      <Sparkles
                        className="h-5 w-5"
                        style={{ color: TBC_QUALITY_COLORS[enchant.quality] || '#1eff00' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium truncate"
                          style={{ color: TBC_QUALITY_COLORS[enchant.quality] || '#1eff00' }}
                        >
                          {enchant.name}
                        </span>
                        {enchant.phase > 1 && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            P{enchant.phase}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatStats(enchant.stats)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab.startsWith('gem-') && (
            <div className="space-y-1">
              {filteredGems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gems found for this socket color
                </div>
              ) : (
                filteredGems.map((gem) => (
                  <div
                    key={gem.id}
                    onClick={() => {
                      onSelectGem?.(gem, selectedGemSocket);
                      onOpenChange(false);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentGems[selectedGemSocket]?.id === gem.id
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${TBC_GEM_COLORS[gem.color]}20`,
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: TBC_QUALITY_COLORS[gem.quality] || '#a335ee',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-sm"
                        style={{
                          backgroundColor: TBC_GEM_COLORS[gem.color] || '#888',
                          boxShadow: `0 0 6px ${TBC_GEM_COLORS[gem.color] || '#888'}`,
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium truncate"
                          style={{ color: TBC_QUALITY_COLORS[gem.quality] || '#a335ee' }}
                        >
                          {gem.name}
                        </span>
                        {gem.phase > 1 && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            P{gem.phase}
                          </span>
                        )}
                        {gem.unique && (
                          <span className="text-xs text-yellow-500 flex-shrink-0">
                            Unique
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatStats(gem.stats)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
