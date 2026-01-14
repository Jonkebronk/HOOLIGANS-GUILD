'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, History, Package, Users, Filter, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { ITEM_QUALITY_COLORS, getItemIconUrl, refreshWowheadTooltips } from '@/lib/wowhead';
import { useTeam } from '@/components/providers/team-provider';
import { CLASS_COLORS } from '@hooligans/shared';

type Player = {
  id: string;
  name: string;
  class: string;
};

type LootRecord = {
  id: string;
  lootDate: string;
  response: string | null;
  phase: string;
  finalized: boolean;
  item: {
    id: string;
    name: string;
    wowheadId: number;
    quality: number;
    icon: string | null;
    slot: string | null;
  };
  player: Player | null;
};

type PlayerStats = {
  id: string;
  name: string;
  class: string;
  totalItems: number;
  items: LootRecord[];
};

const RESPONSE_COLORS: Record<string, string> = {
  BiS: '#a855f7',
  GreaterUpgrade: '#3b82f6',
  MinorUpgrade: '#22c55e',
  Offspec: '#eab308',
  PvP: '#f97316',
  Disenchant: '#6b7280',
};

const RESPONSE_LABELS: Record<string, string> = {
  BiS: 'BiS',
  GreaterUpgrade: 'Greater Upgrade',
  MinorUpgrade: 'Minor Upgrade',
  Offspec: 'Offspec',
  PvP: 'PvP',
  Disenchant: 'Disenchant',
};

export default function LootHistoryPage() {
  const { selectedTeam } = useTeam();
  const [lootHistory, setLootHistory] = useState<LootRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [filterResponse, setFilterResponse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'player' | 'item'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'items' | 'players'>('items');
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const fetchLootHistory = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/loot?teamId=${selectedTeam.id}&history=true`);
      if (res.ok) {
        const data = await res.json();
        setLootHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch loot history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchLootHistory();
  }, [fetchLootHistory]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [lootHistory, viewMode]);

  // Get unique players for filter
  const uniquePlayers = Array.from(
    new Map(
      lootHistory
        .filter(r => r.player)
        .map(r => [r.player!.id, r.player!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter and sort loot records
  const filteredLoot = lootHistory
    .filter(record => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesItem = record.item.name.toLowerCase().includes(query);
        const matchesPlayer = record.player?.name.toLowerCase().includes(query);
        if (!matchesItem && !matchesPlayer) return false;
      }

      // Player filter
      if (filterPlayer !== 'all' && record.player?.id !== filterPlayer) return false;

      // Response filter
      if (filterResponse !== 'all' && record.response !== filterResponse) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.lootDate).getTime() - new Date(b.lootDate).getTime();
          break;
        case 'player':
          comparison = (a.player?.name || '').localeCompare(b.player?.name || '');
          break;
        case 'item':
          comparison = a.item.name.localeCompare(b.item.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Group by player for player view
  const playerStats: PlayerStats[] = Array.from(
    filteredLoot.reduce((acc, record) => {
      if (!record.player) return acc;

      const existing = acc.get(record.player.id);
      if (existing) {
        existing.totalItems++;
        existing.items.push(record);
      } else {
        acc.set(record.player.id, {
          id: record.player.id,
          name: record.player.name,
          class: record.player.class,
          totalItems: 1,
          items: [record],
        });
      }
      return acc;
    }, new Map<string, PlayerStats>())
  ).values();

  const sortedPlayerStats = Array.from(playerStats).sort((a, b) =>
    sortOrder === 'desc' ? b.totalItems - a.totalItems : a.totalItems - b.totalItems
  );

  const togglePlayerExpand = (playerId: string) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Stats summary
  const totalItems = filteredLoot.length;
  const totalPlayers = uniquePlayers.length;
  const bisCount = filteredLoot.filter(r => r.response === 'BiS').length;

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a team first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Loot History
          </h1>
          <p className="text-muted-foreground">
            All finalized loot records for {selectedTeam.name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Players with Loot</p>
                <p className="text-2xl font-bold">{totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <span className="text-yellow-500 text-xl">BiS</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BiS Items Given</p>
                <p className="text-2xl font-bold">{bisCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items or players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Player Filter */}
            <Select value={filterPlayer} onValueChange={setFilterPlayer}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {uniquePlayers.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    <span style={{ color: CLASS_COLORS[player.class] }}>{player.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Response Filter */}
            <Select value={filterResponse} onValueChange={setFilterResponse}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                {Object.entries(RESPONSE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <span style={{ color: RESPONSE_COLORS[value] }}>{label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'items' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('items')}
              >
                <Package className="h-4 w-4 mr-1" />
                Items
              </Button>
              <Button
                variant={viewMode === 'players' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('players')}
              >
                <Users className="h-4 w-4 mr-1" />
                By Player
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLoot.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No loot history found</p>
              <p className="text-sm">Finalized items will appear here</p>
            </div>
          ) : viewMode === 'items' ? (
            /* Items View */
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th
                      className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === 'date' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('item')}
                    >
                      <div className="flex items-center gap-1">
                        Item
                        {sortBy === 'item' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('player')}
                    >
                      <div className="flex items-center gap-1">
                        Player
                        {sortBy === 'player' && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Response</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Slot</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoot.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {new Date(record.lootDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          {record.item.icon && (
                            <img
                              src={getItemIconUrl(record.item.icon, 'small')}
                              alt=""
                              className="w-6 h-6 rounded"
                              style={{
                                borderWidth: 1,
                                borderStyle: 'solid',
                                borderColor: ITEM_QUALITY_COLORS[record.item.quality] || ITEM_QUALITY_COLORS[4],
                              }}
                            />
                          )}
                          <a
                            href={`https://www.wowhead.com/tbc/item=${record.item.wowheadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: ITEM_QUALITY_COLORS[record.item.quality] || ITEM_QUALITY_COLORS[4] }}
                          >
                            {record.item.name}
                          </a>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {record.player ? (
                          <span style={{ color: CLASS_COLORS[record.player.class] }}>
                            {record.player.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {record.response ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              color: RESPONSE_COLORS[record.response],
                              backgroundColor: `${RESPONSE_COLORS[record.response]}20`,
                            }}
                          >
                            {RESPONSE_LABELS[record.response] || record.response}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {record.item.slot || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Players View */
            <div className="space-y-2">
              {sortedPlayerStats.map((player) => {
                const isExpanded = expandedPlayers.has(player.id);
                return (
                  <div key={player.id} className="border border-border/50 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePlayerExpand(player.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className="font-medium"
                          style={{ color: CLASS_COLORS[player.class] }}
                        >
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{player.totalItems} items</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {player.items
                          .sort((a, b) => new Date(b.lootDate).getTime() - new Date(a.lootDate).getTime())
                          .map((record) => (
                          <div key={record.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              {record.item.icon && (
                                <img
                                  src={getItemIconUrl(record.item.icon, 'small')}
                                  alt=""
                                  className="w-5 h-5 rounded"
                                  style={{
                                    borderWidth: 1,
                                    borderStyle: 'solid',
                                    borderColor: ITEM_QUALITY_COLORS[record.item.quality] || ITEM_QUALITY_COLORS[4],
                                  }}
                                />
                              )}
                              <a
                                href={`https://www.wowhead.com/tbc/item=${record.item.wowheadId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                style={{ color: ITEM_QUALITY_COLORS[record.item.quality] || ITEM_QUALITY_COLORS[4] }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {record.item.name}
                              </a>
                            </div>
                            <div className="flex items-center gap-3">
                              {record.response && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    color: RESPONSE_COLORS[record.response],
                                    backgroundColor: `${RESPONSE_COLORS[record.response]}20`,
                                  }}
                                >
                                  {RESPONSE_LABELS[record.response] || record.response}
                                </span>
                              )}
                              <span className="text-muted-foreground text-xs">
                                {new Date(record.lootDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
