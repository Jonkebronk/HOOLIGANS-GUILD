'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Package, Calendar, User, Loader2 } from 'lucide-react';
import { CLASS_COLORS, RAIDS } from '@hooligans/shared';

type LootRecord = {
  id: string;
  lootDate: string;
  response: string;
  lootPoints: number;
  phase: string;
  item: {
    id: string;
    name: string;
    slot: string;
    raid: string;
    boss: string;
  };
  player: {
    id: string;
    name: string;
    class: string;
  };
};

type Player = {
  id: string;
  name: string;
  class: string;
};

const RESPONSE_TYPES = [
  { value: 'BiS', label: 'BiS', color: '#a855f7', points: 200 },
  { value: 'GreaterUpgrade', label: 'Greater Upgrade', color: '#3b82f6', points: 100 },
  { value: 'MinorUpgrade', label: 'Minor Upgrade', color: '#22c55e', points: 50 },
  { value: 'Offspec', label: 'Offspec', color: '#eab308', points: 25 },
  { value: 'PvP', label: 'PvP', color: '#f97316', points: 25 },
  { value: 'Disenchant', label: 'Disenchant', color: '#6b7280', points: 0 },
];

export default function LootCouncilPage() {
  const [lootRecords, setLootRecords] = useState<LootRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [raidFilter, setRaidFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLoot, setNewLoot] = useState({
    itemName: '',
    player: '',
    response: '',
    raid: '',
    boss: '',
  });

  useEffect(() => {
    Promise.all([fetchLootRecords(), fetchPlayers()]).finally(() => setLoading(false));
  }, []);

  const fetchLootRecords = async () => {
    try {
      const res = await fetch('/api/loot');
      if (res.ok) {
        const data = await res.json();
        setLootRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch loot records:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const filteredRecords = lootRecords.filter((record) => {
    const matchesSearch =
      record.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.player?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRaid = raidFilter === 'all' || record.item?.raid === raidFilter;
    const matchesResponse = responseFilter === 'all' || record.response === responseFilter;
    return matchesSearch && matchesRaid && matchesResponse;
  });

  const getResponseStyle = (response: string) => {
    const type = RESPONSE_TYPES.find(r => r.value === response);
    return type ? { color: type.color } : {};
  };

  const totalPoints = lootRecords.reduce((sum, r) => sum + (r.lootPoints || 0), 0);
  const bisCount = lootRecords.filter(r => r.response === 'BiS').length;
  const uniqueRecipients = new Set(lootRecords.map(r => r.player?.id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loot Council</h1>
          <p className="text-muted-foreground">Track and manage loot distribution</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Loot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Loot Distribution</DialogTitle>
              <DialogDescription>Log a new item distribution from the raid.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item">Item Name</Label>
                <Input
                  id="item"
                  value={newLoot.itemName}
                  onChange={(e) => setNewLoot({ ...newLoot, itemName: e.target.value })}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player">Player</Label>
                <Select value={newLoot.player} onValueChange={(value) => setNewLoot({ ...newLoot, player: value })}>
                  <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <span style={{ color: CLASS_COLORS[player.class] }}>{player.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="response">Response</Label>
                <Select value={newLoot.response} onValueChange={(value) => setNewLoot({ ...newLoot, response: value })}>
                  <SelectTrigger><SelectValue placeholder="Select response" /></SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span style={{ color: type.color }}>{type.label}</span>
                        <span className="text-muted-foreground ml-2">({type.points} pts)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raid">Raid</Label>
                <Select value={newLoot.raid} onValueChange={(value) => setNewLoot({ ...newLoot, raid: value })}>
                  <SelectTrigger><SelectValue placeholder="Select raid" /></SelectTrigger>
                  <SelectContent>
                    {RAIDS.map((raid) => (
                      <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button disabled={!newLoot.itemName || !newLoot.player || !newLoot.response}>
                Record Loot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lootRecords.length}</div>
            <p className="text-xs text-muted-foreground">items distributed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BiS Items</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{bisCount}</div>
            <p className="text-xs text-muted-foreground">
              {lootRecords.length > 0 ? `${((bisCount / lootRecords.length) * 100).toFixed(0)}% of total` : '0% of total'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">loot points awarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Recipients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueRecipients}</div>
            <p className="text-xs text-muted-foreground">players received loot</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items or players..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={raidFilter} onValueChange={setRaidFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Raid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Raids</SelectItem>
                {RAIDS.map((raid) => (
                  <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={responseFilter} onValueChange={setResponseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                {RESPONSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span style={{ color: type.color }}>{type.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {lootRecords.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Loot Records Yet</h3>
              <p className="text-muted-foreground mb-4">Start recording loot distribution from your raids.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Record Loot
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Player</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Response</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Raid</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Boss</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-purple-400">{record.item?.name}</div>
                        <div className="text-xs text-muted-foreground">{record.item?.slot}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span style={{ color: CLASS_COLORS[record.player?.class] }}>{record.player?.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            ...getResponseStyle(record.response),
                            backgroundColor: `${getResponseStyle(record.response).color}20`
                          }}
                        >
                          {RESPONSE_TYPES.find(r => r.value === record.response)?.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{record.item?.raid}</td>
                      <td className="py-3 px-4 text-muted-foreground">{record.item?.boss}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(record.lootDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{record.lootPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
