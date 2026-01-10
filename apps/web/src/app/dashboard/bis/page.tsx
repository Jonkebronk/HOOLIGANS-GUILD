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
import { CheckCircle, Circle, Shield, Heart, Sword, Loader2, Target } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl, getItemIconUrl, refreshWowheadTooltips, SLOT_ICONS } from '@/lib/wowhead';

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

const GEAR_SLOTS = [
  { slot: 'Head', label: 'Head' },
  { slot: 'Neck', label: 'Neck' },
  { slot: 'Shoulder', label: 'Shoulder' },
  { slot: 'Back', label: 'Back' },
  { slot: 'Chest', label: 'Chest' },
  { slot: 'Wrist', label: 'Wrist' },
  { slot: 'Hands', label: 'Hands' },
  { slot: 'Waist', label: 'Waist' },
  { slot: 'Legs', label: 'Legs' },
  { slot: 'Feet', label: 'Feet' },
  { slot: 'Finger1', label: 'Ring 1' },
  { slot: 'Finger2', label: 'Ring 2' },
  { slot: 'Trinket1', label: 'Trinket 1' },
  { slot: 'Trinket2', label: 'Trinket 2' },
  { slot: 'MainHand', label: 'Main Hand' },
  { slot: 'OffHand', label: 'Off Hand' },
  { slot: 'Ranged', label: 'Ranged/Relic' },
];

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
};

export default function BisListsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedPlayer]);

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

  const getRoleIcon = (spec: string) => {
    if (spec?.includes('Protection') || spec?.includes('Guardian')) return <Shield className="h-4 w-4 text-blue-400" />;
    if (spec?.includes('Restoration') || spec?.includes('Holy') || spec?.includes('Discipline')) return <Heart className="h-4 w-4 text-green-400" />;
    return <Sword className="h-4 w-4 text-red-400" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BiS Lists</h1>
          <p className="text-muted-foreground">Track Best in Slot gear progress</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Player List */}
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

        {/* BiS Gear Comparison */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedPlayerData && (
                  <img
                    src={getSpecIconUrl(selectedPlayerData.mainSpec)}
                    alt={selectedPlayerData.mainSpec}
                    className="w-12 h-12 rounded-lg"
                    style={{ borderColor: CLASS_COLORS[selectedPlayerData.class], borderWidth: 2 }}
                  />
                )}
                <div>
                  <CardTitle className="text-xl" style={{ color: selectedPlayerData ? CLASS_COLORS[selectedPlayerData.class] : undefined }}>
                    {selectedPlayer || 'Select a player'}
                  </CardTitle>
                  {selectedPlayerData && (
                    <p className="text-sm text-muted-foreground">
                      {selectedPlayerData.mainSpec?.replace(selectedPlayerData.class, '')} {selectedPlayerData.class}
                    </p>
                  )}
                </div>
              </div>
              {selectedPlayerData && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-muted-foreground">
                    0%
                  </div>
                  <p className="text-xs text-muted-foreground">BiS Complete</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedPlayerData ? (
              <div className="space-y-1">
                {GEAR_SLOTS.map(({ slot, label }) => (
                  <div
                    key={slot}
                    className="flex items-center gap-4 p-2 rounded-lg bg-muted/30"
                  >
                    {/* Slot icon */}
                    <img
                      src={getItemIconUrl(SLOT_ICONS[slot] || 'inv_misc_questionmark', 'medium')}
                      alt={label}
                      className="w-8 h-8 rounded opacity-50"
                    />

                    {/* Current item */}
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground italic">Empty</span>
                    </div>

                    {/* BiS item */}
                    <div className="flex-1 flex items-center gap-2 justify-end">
                      <span className="text-sm text-muted-foreground italic">Not configured</span>
                    </div>

                    {/* Status icon */}
                    <div className="w-6">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Select a player to view their BiS list</p>
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">
                BiS configuration coming soon. Add items to the database and configure BiS lists for each spec.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
