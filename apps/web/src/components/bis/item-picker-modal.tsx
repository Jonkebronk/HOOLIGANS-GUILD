'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Search, X, Loader2 } from 'lucide-react';
import { getItemIconUrl, refreshWowheadTooltips, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

type DatabaseItem = {
  id: string;
  name: string;
  wowheadId: number;
  slot: string;
  raid: string;
  boss: string | null;
  phase: string;
  quality: number;
  icon: string | null;
};

interface ItemPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: string;
  slotLabel: string;
  onSelectItem?: (item: DatabaseItem) => void;
  onClear?: () => void;
  currentWowheadId?: number | null;
}

// Map BiS slot names to database slot names
// Map BiS slots to item slots (what items can go in each character slot)
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
  MainHand: ['MainHand', 'OneHand', 'Weapon'],  // Two-handers & main-hand only items, one-handers can go here
  OffHand: ['OffHand', 'OneHand'],              // Off-hand items & shields, one-handers can go here too
  Ranged: ['Ranged'],                           // Bows, guns, wands, relics, totems, etc.
};

export function ItemPickerModal({
  open,
  onOpenChange,
  slot,
  slotLabel,
  onSelectItem,
  onClear,
  currentWowheadId,
}: ItemPickerModalProps) {
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string>('all');
  const [raid, setRaid] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch items from database
  useEffect(() => {
    if (open) {
      fetchItems();
      setSearchQuery('');
    }
  }, [open]);

  // Refresh tooltips when items change
  useEffect(() => {
    if (open && items.length > 0) {
      refreshWowheadTooltips();
      const timer = setTimeout(() => refreshWowheadTooltips(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, items, phase, searchQuery, raid]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get valid slot names for this gear slot
  const validSlots = slotMapping[slot] || [slot];

  // Get unique raids from items
  const uniqueRaids = useMemo(() => {
    const raids = new Set(items.map(i => i.raid));
    return Array.from(raids).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => {
      // Filter by slot
      if (!validSlots.some(s => item.slot?.toLowerCase().includes(s.toLowerCase()))) {
        return false;
      }

      // Filter by phase
      if (phase !== 'all' && item.phase !== phase) return false;

      // Filter by raid
      if (raid !== 'all' && item.raid !== raid) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });

    // Sort by phase desc, then quality desc, then name
    filtered.sort((a, b) => {
      const phaseA = parseInt(a.phase?.replace('P', '') || '0');
      const phaseB = parseInt(b.phase?.replace('P', '') || '0');
      if (phaseB !== phaseA) return phaseB - phaseA;
      if (b.quality !== a.quality) return b.quality - a.quality;
      return a.name.localeCompare(b.name);
    });

    return filtered.slice(0, 100);
  }, [items, validSlots, phase, raid, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Select {slotLabel}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="P1">P1</SelectItem>
              <SelectItem value="P2">P2</SelectItem>
              <SelectItem value="P3">P3</SelectItem>
              <SelectItem value="P4">P4</SelectItem>
              <SelectItem value="P5">P5</SelectItem>
            </SelectContent>
          </Select>
          <Select value={raid} onValueChange={setRaid}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Raid" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Raids</SelectItem>
              {uniqueRaids.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onClear && (
            <Button variant="destructive" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" />
              Clear Slot
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found for this slot in your database.
              <br />
              <span className="text-sm">Import items on the Items page first.</span>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectItem?.(item);
                    onOpenChange(false);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    currentWowheadId === item.wowheadId
                      ? 'bg-primary/20 border border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <a
                    href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                    onClick={(e) => e.preventDefault()}
                    className="flex-shrink-0"
                  >
                    <img
                      src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                      alt={item.name}
                      className="w-9 h-9 rounded"
                      style={{
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4],
                      }}
                    />
                  </a>
                  <div className="flex-1 min-w-0">
                    <span
                      className="font-medium block truncate"
                      style={{ color: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {item.raid} {item.boss ? `- ${item.boss}` : ''} ({item.phase})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                    {item.phase}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
