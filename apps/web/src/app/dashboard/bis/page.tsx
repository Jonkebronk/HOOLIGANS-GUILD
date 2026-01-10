'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Target } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl, getItemIconUrl, refreshWowheadTooltips, SLOT_ICONS, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

// Left column slots (top to bottom)
const LEFT_SLOTS = [
  { slot: 'Head', label: 'Head' },
  { slot: 'Neck', label: 'Neck' },
  { slot: 'Shoulder', label: 'Shoulders' },
  { slot: 'Back', label: 'Back' },
  { slot: 'Chest', label: 'Chest' },
  { slot: 'Wrist', label: 'Wrists' },
  { slot: 'Weapon1', label: 'Main Hand' },
  { slot: 'Weapon2', label: 'Off Hand' },
];

// Right column slots (top to bottom)
const RIGHT_SLOTS = [
  { slot: 'Hands', label: 'Hands' },
  { slot: 'Waist', label: 'Waist' },
  { slot: 'Legs', label: 'Legs' },
  { slot: 'Feet', label: 'Feet' },
  { slot: 'Finger1', label: 'Ring 1' },
  { slot: 'Finger2', label: 'Ring 2' },
  { slot: 'Trinket1', label: 'Trinket 1' },
  { slot: 'Trinket2', label: 'Trinket 2' },
  { slot: 'Ranged', label: 'Ranged' },
];

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
};

type BisItem = {
  slot: string;
  item: {
    id: string;
    name: string;
    wowheadId: number;
    icon?: string;
    quality: number;
    raid: string;
    boss: string;
  } | null;
};

export default function BisListsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [bisItems, setBisItems] = useState<BisItem[]>([]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedPlayer, bisItems]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
        if (data.length > 0) {
          setSelectedPlayer(data[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    return classFilter === 'all' || player.class === classFilter;
  });

  const selectedPlayerData = players.find(p => p.name === selectedPlayer);

  // Get BiS item for a slot (placeholder - will be populated from database later)
  const getBisItem = (slot: string): BisItem['item'] => {
    const item = bisItems.find(b => b.slot === slot);
    return item?.item || null;
  };

  // Get all BiS items for the raids table
  const getAllBisItems = () => {
    return bisItems.filter(b => b.item !== null).map(b => b.item!);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">BiS Lists</h1>
            <p className="text-muted-foreground">Track Best in Slot gear progress</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add players to your roster first to track their BiS progress.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderGearSlot = (slot: string, label: string, align: 'left' | 'right') => {
    const item = getBisItem(slot);
    const slotIcon = SLOT_ICONS[slot] || 'inv_misc_questionmark';

    return (
      <div
        key={slot}
        className={`flex items-center gap-3 py-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}
      >
        {/* Item icon or empty slot */}
        <a
          href={item ? `https://www.wowhead.com/tbc/item=${item.wowheadId}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          data-wowhead={item ? `item=${item.wowheadId}&domain=tbc` : undefined}
          className={item ? 'cursor-pointer' : 'cursor-default'}
        >
          <img
            src={item ? getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium') : getItemIconUrl(slotIcon, 'medium')}
            alt={item?.name || label}
            className="w-10 h-10 rounded"
            style={{
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: item ? (ITEM_QUALITY_COLORS[item.quality] || '#1eff00') : '#333',
              opacity: item ? 1 : 0.4,
            }}
          />
        </a>

        {/* Item name and slot label */}
        <div className={`flex-1 min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
          {item ? (
            <>
              <a
                href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                target="_blank"
                rel="noopener noreferrer"
                data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                className="font-medium text-sm hover:underline block truncate"
                style={{ color: ITEM_QUALITY_COLORS[item.quality] || '#a335ee' }}
              >
                {item.name}
              </a>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BiS Lists</h1>
          <p className="text-muted-foreground">Track Best in Slot gear progress</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Player List Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Characters</CardTitle>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {WOW_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    <span style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[700px] overflow-y-auto">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.name)}
                className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-3 ${
                  selectedPlayer === player.name
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <img
                  src={getSpecIconUrl(player.mainSpec)}
                  alt={player.mainSpec}
                  className="w-8 h-8 rounded"
                  style={{ borderColor: CLASS_COLORS[player.class], borderWidth: 2 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium truncate">
                      {player.name}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      0%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.mainSpec?.replace(player.class, '')}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Character Header */}
          {selectedPlayerData && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <img
                    src={getSpecIconUrl(selectedPlayerData.mainSpec)}
                    alt={selectedPlayerData.mainSpec}
                    className="w-16 h-16 rounded-lg"
                    style={{ borderColor: CLASS_COLORS[selectedPlayerData.class], borderWidth: 3 }}
                  />
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: CLASS_COLORS[selectedPlayerData.class] }}>
                      {selectedPlayer}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedPlayerData.mainSpec?.replace(selectedPlayerData.class, '')} {selectedPlayerData.class}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-3xl font-bold text-muted-foreground">0%</div>
                    <p className="text-xs text-muted-foreground">BiS Complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gear Display - Sixty Upgrades Style */}
          <Card>
            <CardContent className="py-6">
              {selectedPlayerData ? (
                <div className="grid grid-cols-3 gap-4">
                  {/* Left Column - Slots */}
                  <div className="space-y-1">
                    {LEFT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'left'))}
                  </div>

                  {/* Center - Character Display */}
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      {/* Character silhouette/icon */}
                      <div
                        className="w-48 h-64 rounded-lg flex items-center justify-center"
                        style={{
                          background: `linear-gradient(180deg, ${CLASS_COLORS[selectedPlayerData.class]}20 0%, transparent 100%)`,
                          border: `2px solid ${CLASS_COLORS[selectedPlayerData.class]}40`,
                        }}
                      >
                        <img
                          src={getSpecIconUrl(selectedPlayerData.mainSpec)}
                          alt={selectedPlayerData.mainSpec}
                          className="w-24 h-24 rounded-full opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Slots */}
                  <div className="space-y-1">
                    {RIGHT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'right'))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Select a player to view their BiS list</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raids Table */}
          {selectedPlayerData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">RAIDS</CardTitle>
              </CardHeader>
              <CardContent>
                {getAllBisItems().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border">
                          <th className="pb-3 font-medium">Item</th>
                          <th className="pb-3 font-medium">Zone</th>
                          <th className="pb-3 font-medium">Boss</th>
                          <th className="pb-3 font-medium text-right">Drop Chance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {getAllBisItems().map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <a
                                  href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                                >
                                  <img
                                    src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                                    alt={item.name}
                                    className="w-9 h-9 rounded"
                                    style={{
                                      borderWidth: 2,
                                      borderStyle: 'solid',
                                      borderColor: ITEM_QUALITY_COLORS[item.quality] || '#a335ee'
                                    }}
                                  />
                                </a>
                                <a
                                  href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                                  className="font-medium hover:underline"
                                  style={{ color: ITEM_QUALITY_COLORS[item.quality] || '#a335ee' }}
                                >
                                  {item.name}
                                </a>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground">{item.raid}</td>
                            <td className="py-3 text-muted-foreground">{item.boss}</td>
                            <td className="py-3 text-right text-muted-foreground">-</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">
                      No BiS items configured yet. Configure BiS lists for each spec to see item sources here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
