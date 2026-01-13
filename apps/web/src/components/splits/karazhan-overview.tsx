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

// Role colors for PuG view
const ROLE_COLORS: Record<string, string> = {
  Tank: '#c79c6e', // Warrior brown
  Healer: '#f58cba', // Paladin pink
  'Melee DPS': '#fff569', // Rogue yellow
  'Ranged DPS': '#9482c9', // Warlock purple
};

// Spec presets for PuG mode - which specs could use items from each slot
// These are the typical Karazhan BiS contenders by slot type
const SLOT_SPECS: Record<string, { spec: string; class: string; role: string }[]> = {
  // Cloth armor
  Head: [
    { spec: 'Shadow', class: 'Priest', role: 'Ranged DPS' },
    { spec: 'Fire', class: 'Mage', role: 'Ranged DPS' },
    { spec: 'Affliction', class: 'Warlock', role: 'Ranged DPS' },
    { spec: 'Holy', class: 'Priest', role: 'Healer' },
    { spec: 'Resto', class: 'Shaman', role: 'Healer' },
    { spec: 'Balance', class: 'Druid', role: 'Ranged DPS' },
    { spec: 'Feral', class: 'Druid', role: 'Tank' },
    { spec: 'Prot', class: 'Warrior', role: 'Tank' },
    { spec: 'Prot', class: 'Paladin', role: 'Tank' },
    { spec: 'Ret', class: 'Paladin', role: 'Melee DPS' },
    { spec: 'Fury', class: 'Warrior', role: 'Melee DPS' },
    { spec: 'Combat', class: 'Rogue', role: 'Melee DPS' },
    { spec: 'BM', class: 'Hunter', role: 'Ranged DPS' },
    { spec: 'Enhance', class: 'Shaman', role: 'Melee DPS' },
  ],
  // Weapons
  MainHand: [
    { spec: 'Prot', class: 'Warrior', role: 'Tank' },
    { spec: 'Fury', class: 'Warrior', role: 'Melee DPS' },
    { spec: 'Combat', class: 'Rogue', role: 'Melee DPS' },
    { spec: 'Feral', class: 'Druid', role: 'Tank' },
    { spec: 'Ret', class: 'Paladin', role: 'Melee DPS' },
    { spec: 'Enhance', class: 'Shaman', role: 'Melee DPS' },
  ],
  OffHand: [
    { spec: 'Combat', class: 'Rogue', role: 'Melee DPS' },
    { spec: 'Fury', class: 'Warrior', role: 'Melee DPS' },
    { spec: 'Shadow', class: 'Priest', role: 'Ranged DPS' },
    { spec: 'Fire', class: 'Mage', role: 'Ranged DPS' },
    { spec: 'Affliction', class: 'Warlock', role: 'Ranged DPS' },
    { spec: 'Holy', class: 'Paladin', role: 'Healer' },
    { spec: 'Resto', class: 'Shaman', role: 'Healer' },
  ],
  TwoHand: [
    { spec: 'Ret', class: 'Paladin', role: 'Melee DPS' },
    { spec: 'Arms', class: 'Warrior', role: 'Melee DPS' },
    { spec: 'Feral', class: 'Druid', role: 'Tank' },
    { spec: 'Enhance', class: 'Shaman', role: 'Melee DPS' },
    { spec: 'BM', class: 'Hunter', role: 'Ranged DPS' },
  ],
  Ranged: [
    { spec: 'BM', class: 'Hunter', role: 'Ranged DPS' },
    { spec: 'Marks', class: 'Hunter', role: 'Ranged DPS' },
    { spec: 'Survival', class: 'Hunter', role: 'Ranged DPS' },
    { spec: 'Fury', class: 'Warrior', role: 'Melee DPS' },
    { spec: 'Combat', class: 'Rogue', role: 'Melee DPS' },
  ],
  // Jewelry
  Trinket: [
    { spec: 'All DPS', class: 'All', role: 'Ranged DPS' },
    { spec: 'All Healers', class: 'All', role: 'Healer' },
    { spec: 'All Tanks', class: 'All', role: 'Tank' },
  ],
  Finger: [
    { spec: 'All DPS', class: 'All', role: 'Ranged DPS' },
    { spec: 'All Healers', class: 'All', role: 'Healer' },
    { spec: 'All Tanks', class: 'All', role: 'Tank' },
  ],
  Neck: [
    { spec: 'All DPS', class: 'All', role: 'Ranged DPS' },
    { spec: 'All Healers', class: 'All', role: 'Healer' },
    { spec: 'All Tanks', class: 'All', role: 'Tank' },
  ],
  Back: [
    { spec: 'All DPS', class: 'All', role: 'Ranged DPS' },
    { spec: 'All Healers', class: 'All', role: 'Healer' },
    { spec: 'All Tanks', class: 'All', role: 'Tank' },
  ],
};

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
              <>
                <span>Specs colored by role:</span>
                <span style={{ color: ROLE_COLORS.Tank }}>Tank</span>
                <span style={{ color: ROLE_COLORS.Healer }}>Healer</span>
                <span style={{ color: ROLE_COLORS['Melee DPS'] }}>Melee DPS</span>
                <span style={{ color: ROLE_COLORS['Ranged DPS'] }}>Ranged DPS</span>
              </>
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

  // Get specs for this slot in PuG mode
  const slotSpecs = SLOT_SPECS[item.slot] || SLOT_SPECS.Head;

  return (
    <div className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/30">
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

      {/* Item name and needers/specs */}
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
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
          {isPuG ? (
            // PuG mode: show specs that could use this item
            slotSpecs.map((specInfo, idx) => (
              <span
                key={`${specInfo.spec}-${specInfo.class}-${idx}`}
                className="text-xs"
                style={{ color: ROLE_COLORS[specInfo.role] || '#888' }}
                title={`${specInfo.spec} ${specInfo.class}`}
              >
                {specInfo.class === 'All' ? specInfo.spec : `${specInfo.spec} ${specInfo.class}`}
              </span>
            ))
          ) : (
            // Team mode: show player needers
            sortedNeeders.map((needer, idx) => (
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
            ))
          )}
        </div>
      </div>

      {/* Slot badge */}
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
        {item.slot}
      </span>
    </div>
  );
}
