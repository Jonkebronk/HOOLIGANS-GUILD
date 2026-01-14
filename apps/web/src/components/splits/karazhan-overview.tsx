'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Search, Check, Loader2 } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getItemIconUrl, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

type Needer = {
  playerId: string | null;
  name: string;
  class: string;
  hasReceived: boolean;
  receivedDate?: string;
};

type KarazhanItem = {
  id: string;
  name: string;
  wowheadId: number | null;
  icon: string | null;
  quality: number;
  boss: string;
  slot: string;
  needers: Needer[];
};

type KarazhanOverviewProps = {
  teamId: string;
  isPuG?: boolean;
};

// Role colors for PuG view - not used in simplified view

export function KarazhanOverview({ teamId, isPuG = false }: KarazhanOverviewProps) {
  const [items, setItems] = useState<KarazhanItem[]>([]);
  const [bosses, setBosses] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [bossFilter, setBossFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [teamId, isPuG]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = isPuG
        ? `/api/items/karazhan-needs?teamId=${teamId}&isPuG=true`
        : `/api/items/karazhan-needs?teamId=${teamId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setBosses(data.bosses);
        setSlots(data.slots);
      }
    } catch (error) {
      console.error('Failed to fetch Karazhan needs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesBoss = bossFilter === 'all' || item.boss === bossFilter;
    const matchesSlot = slotFilter === 'all' || item.slot === slotFilter;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.boss.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (!isPuG && item.needers.some((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    return matchesBoss && matchesSlot && matchesSearch;
  });

  // Group items by boss
  const itemsByBoss = filteredItems.reduce((acc, item) => {
    if (!acc[item.boss]) {
      acc[item.boss] = [];
    }
    acc[item.boss].push(item);
    return acc;
  }, {} as Record<string, KarazhanItem[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isPuG ? 'Karazhan Loot (PuG)' : 'Karazhan Loot Overview'}
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {isPuG ? 'Karazhan Loot (PuG)' : 'Karazhan Loot Overview'} ({filteredItems.length} items)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={isPuG ? "Search items or bosses..." : "Search items or players..."}
                className="pl-9 h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={bossFilter} onValueChange={setBossFilter}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="All Bosses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bosses</SelectItem>
                {bosses.map((boss) => (
                  <SelectItem key={boss} value={boss}>
                    {boss}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="All Slots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {slots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items grouped by boss */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(itemsByBoss).map(([boss, bossItems]) => (
              <div key={boss}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-card py-1">
                  {boss}
                </h4>
                <div className="space-y-2">
                  {bossItems.map((item) => (
                    <ItemRow key={item.id} item={item} isPuG={isPuG} />
                  ))}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {items.length === 0
                  ? (isPuG
                      ? 'No Karazhan items found in the database.'
                      : 'No Karazhan items with BiS assignments found. Set "BiS For" on items in the Items page.')
                  : 'No items match your filters.'}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex flex-wrap items-center gap-4">
            {isPuG ? (
              <span>Click items to view on Wowhead. Use soft-res to reserve loot.</span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="line-through">Name</span>
                  = Already received
                </span>
                <span>Player names colored by class</span>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ItemRow({ item, isPuG = false }: { item: KarazhanItem; isPuG?: boolean }) {
  const iconUrl = item.icon
    ? getItemIconUrl(item.icon, 'small')
    : getItemIconUrl('inv_misc_questionmark', 'small');

  const qualityColor = ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4];

  // Sort needers: those who haven't received first
  const sortedNeeders = [...item.needers].sort((a, b) => {
    if (a.hasReceived && !b.hasReceived) return 1;
    if (!a.hasReceived && b.hasReceived) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30">
      {/* Item icon */}
      <a
        href={item.wowheadId ? `https://www.wowhead.com/tbc/item=${item.wowheadId}` : '#'}
        target="_blank"
        rel="noopener noreferrer"
        data-wowhead={item.wowheadId ? `item=${item.wowheadId}&domain=tbc` : undefined}
        className="flex-shrink-0"
      >
        <img
          src={iconUrl}
          alt={item.name}
          className="w-7 h-7 rounded"
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: qualityColor,
          }}
        />
      </a>

      {/* Item name and needers */}
      <div className="flex-1 min-w-0">
        <a
          href={item.wowheadId ? `https://www.wowhead.com/tbc/item=${item.wowheadId}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          data-wowhead={item.wowheadId ? `item=${item.wowheadId}&domain=tbc` : undefined}
          className="text-sm font-medium hover:underline"
          style={{ color: qualityColor }}
        >
          {item.name}
        </a>
        {/* Only show needers for team mode */}
        {!isPuG && sortedNeeders.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
            {sortedNeeders.map((needer, idx) => (
              <span
                key={`${needer.name}-${idx}`}
                className={`text-xs flex items-center gap-0.5 ${
                  needer.hasReceived ? 'line-through opacity-60' : ''
                }`}
                style={{ color: CLASS_COLORS[needer.class] || '#888' }}
                title={
                  needer.hasReceived
                    ? `Received on ${new Date(needer.receivedDate!).toLocaleDateString()}`
                    : `Needs this item`
                }
              >
                {needer.hasReceived && (
                  <Check className="h-3 w-3 text-green-500" />
                )}
                {needer.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Slot badge */}
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
        {item.slot}
      </span>
    </div>
  );
}
