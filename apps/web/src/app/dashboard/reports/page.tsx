'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Users, Package, Calendar, Award, Target, Loader2, History, Clock, ArrowUpDown, ChevronDown } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { useTeam } from '@/components/providers/team-provider';

type Item = {
  id: string;
  name: string;
  wowheadId: number | null;
  quality: string | null;
  icon: string | null;
  lootPriority: string | null;
  bisFor: string[];
  bisNextPhase: string[];
};

type LootRecord = {
  id: string;
  response: string;
  lootPoints: number;
  lootDate: string;
  phase: string | null;
  item: Item | null;
  player: {
    id: string;
    name: string;
    class: string;
  };
};

type PlayerWithAttendance = {
  id: string;
  name: string;
  class: string;
  attendancePercent: number;
  raidsAttended?: number;
};

type FairnessData = {
  playerId: string;
  name: string;
  class: string;
  itemsThisPhase: number;
  lastItemDate: Date | null;
  daysSinceLastItem: number | null;
  raidsAttended: number;
  itemsPerRaid: number;
  status: 'green' | 'yellow' | 'red';
};

const RESPONSE_TYPES = [
  { value: 'BiS', label: 'BiS', color: '#a855f7' },
  { value: 'GreaterUpgrade', label: 'Greater Upgrade', color: '#3b82f6' },
  { value: 'MinorUpgrade', label: 'Minor Upgrade', color: '#22c55e' },
  { value: 'Offspec', label: 'Offspec', color: '#eab308' },
  { value: 'Disenchant', label: 'Disenchant', color: '#6b7280' },
];

type SortField = 'name' | 'itemsThisPhase' | 'daysSinceLastItem' | 'itemsPerRaid';
type SortDirection = 'asc' | 'desc';

export default function LootHistoryPage() {
  const { selectedTeam } = useTeam();
  const [lootRecords, setLootRecords] = useState<LootRecord[]>([]);
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('daysSinceLastItem');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  useEffect(() => {
    if (selectedTeam) {
      Promise.all([fetchLootRecords(), fetchAttendance()]).finally(() => setLoading(false));
    }
  }, [selectedTeam]);

  const fetchLootRecords = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/loot?teamId=${selectedTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setLootRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch loot records:', error);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/attendance?teamId=${selectedTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  // Calculate fairness data
  const fairnessData = useMemo((): FairnessData[] => {
    const now = new Date();
    const avgItemsPerRaid = players.length > 0 && lootRecords.length > 0
      ? lootRecords.length / players.reduce((sum, p) => sum + (p.raidsAttended || Math.ceil(p.attendancePercent / 10)), 0)
      : 0;

    return players.map(player => {
      const playerLoot = lootRecords.filter(r => r.player?.id === player.id);
      const itemsThisPhase = playerLoot.length;

      // Find most recent loot date
      const sortedDates = playerLoot
        .map(r => new Date(r.lootDate))
        .sort((a, b) => b.getTime() - a.getTime());
      const lastItemDate = sortedDates[0] || null;

      const daysSinceLastItem = lastItemDate
        ? Math.floor((now.getTime() - lastItemDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Estimate raids attended (if not provided, estimate from attendance %)
      const raidsAttended = player.raidsAttended || Math.max(1, Math.ceil(player.attendancePercent / 10));
      const itemsPerRaid = raidsAttended > 0 ? itemsThisPhase / raidsAttended : 0;

      // Determine status
      let status: 'green' | 'yellow' | 'red' = 'green';
      if (daysSinceLastItem === null) {
        status = 'red'; // Never received an item
      } else if (daysSinceLastItem <= 3) {
        status = 'green';
      } else if (daysSinceLastItem <= 7) {
        status = 'yellow';
      } else if (itemsPerRaid < avgItemsPerRaid) {
        status = 'red';
      } else {
        status = 'yellow';
      }

      return {
        playerId: player.id,
        name: player.name,
        class: player.class,
        itemsThisPhase,
        lastItemDate,
        daysSinceLastItem,
        raidsAttended,
        itemsPerRaid,
        status,
      };
    });
  }, [players, lootRecords]);

  // Sort fairness data
  const sortedFairnessData = useMemo(() => {
    return [...fairnessData].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'itemsThisPhase':
          comparison = a.itemsThisPhase - b.itemsThisPhase;
          break;
        case 'daysSinceLastItem':
          // Handle null values (never received) - treat as very high
          const aDays = a.daysSinceLastItem ?? 999;
          const bDays = b.daysSinceLastItem ?? 999;
          comparison = aDays - bDays;
          break;
        case 'itemsPerRaid':
          comparison = a.itemsPerRaid - b.itemsPerRaid;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [fairnessData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Player loot timeline
  const selectedPlayerLoot = useMemo(() => {
    if (!selectedPlayerId) return [];
    return lootRecords
      .filter(r => r.player?.id === selectedPlayerId)
      .sort((a, b) => new Date(b.lootDate).getTime() - new Date(a.lootDate).getTime());
  }, [selectedPlayerId, lootRecords]);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  // Calculate stats from real data
  const lootByClass = Object.entries(
    lootRecords.reduce((acc, record) => {
      const playerClass = record.player?.class || 'Unknown';
      acc[playerClass] = (acc[playerClass] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([wowClass, count]) => ({
    class: wowClass,
    count,
    color: CLASS_COLORS[wowClass] || '#6b7280',
  })).sort((a, b) => b.count - a.count);

  const lootByResponse = RESPONSE_TYPES.map(type => {
    const count = lootRecords.filter(r => r.response === type.value).length;
    const percent = lootRecords.length > 0 ? Math.round((count / lootRecords.length) * 100) : 0;
    return { ...type, count, percent };
  }).filter(r => r.count > 0);

  const topLootReceivers = Object.entries(
    lootRecords.reduce((acc, record) => {
      const playerId = record.player?.id;
      if (!playerId) return acc;
      if (!acc[playerId]) {
        acc[playerId] = {
          name: record.player.name,
          class: record.player.class,
          items: 0,
          points: 0,
        };
      }
      acc[playerId].items += 1;
      acc[playerId].points += record.lootPoints || 0;
      return acc;
    }, {} as Record<string, { name: string; class: string; items: number; points: number }>)
  ).map(([_, data]) => data)
    .sort((a, b) => b.items - a.items)
    .slice(0, 5);

  const avgAttendance = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.attendancePercent, 0) / players.length)
    : 0;

  const maxLoot = Math.max(...lootByClass.map(c => c.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = lootRecords.length > 0 || players.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loot History</h1>
          <p className="text-muted-foreground">Track loot distribution and fairness</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start adding players, recording loot, and tracking attendance to see history.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getResponseColor = (response: string) => {
    const type = RESPONSE_TYPES.find(t => t.value === response);
    return type?.color || '#6b7280';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Loot History</h1>
        <p className="text-muted-foreground">Track loot distribution and fairness</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Distributed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lootRecords.length}</div>
            <p className="text-xs text-muted-foreground">this phase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg BiS Completion</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">0%</div>
            <p className="text-xs text-muted-foreground">across roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Raiders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">on roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgAttendance >= 80 ? 'text-green-500' : avgAttendance >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {avgAttendance}%
            </div>
            <p className="text-xs text-muted-foreground">guild average</p>
          </CardContent>
        </Card>
      </div>

      {/* Loot Distribution Fairness Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loot Distribution Fairness
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedFairnessData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No player data yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground"
                      >
                        Player
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-2">Class</th>
                    <th className="text-center py-3 px-2">
                      <button
                        onClick={() => handleSort('itemsThisPhase')}
                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground mx-auto"
                      >
                        Items
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-center py-3 px-2">Last Item</th>
                    <th className="text-center py-3 px-2">
                      <button
                        onClick={() => handleSort('daysSinceLastItem')}
                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground mx-auto"
                      >
                        Days Since
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-center py-3 px-2">
                      <button
                        onClick={() => handleSort('itemsPerRaid')}
                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground mx-auto"
                      >
                        Items/Raid
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-center py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFairnessData.map((row) => (
                    <tr key={row.playerId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-medium" style={{ color: CLASS_COLORS[row.class] }}>
                        {row.name}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{row.class}</td>
                      <td className="py-2 px-2 text-center">{row.itemsThisPhase}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">
                        {row.lastItemDate
                          ? row.lastItemDate.toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.daysSinceLastItem !== null ? row.daysSinceLastItem : '-'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.itemsPerRaid.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          row.status === 'green' ? 'bg-green-500' :
                          row.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} title={
                          row.status === 'green' ? 'Received item recently' :
                          row.status === 'yellow' ? '3-7 days since last item' :
                          'Due for loot'
                        } />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Loot Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Player Loot Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Player Dropdown */}
          <div className="mb-4 relative">
            <button
              onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
              className="w-full md:w-64 flex items-center justify-between px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80"
            >
              {selectedPlayer ? (
                <span style={{ color: CLASS_COLORS[selectedPlayer.class] }} className="font-medium">
                  {selectedPlayer.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a player...</span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showPlayerDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPlayerDropdown && (
              <div className="absolute z-10 mt-1 w-full md:w-64 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {players
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayerId(player.id);
                        setShowPlayerDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">
                        {player.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">({player.class})</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          {selectedPlayerId ? (
            selectedPlayerLoot.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loot recorded for this player
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPlayerLoot.map(record => (
                  <div key={record.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    {/* Item icon placeholder */}
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      {record.item?.wowheadId ? (
                        <a
                          href={`https://www.wowhead.com/item=${record.item.wowheadId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wowhead={`item=${record.item.wowheadId}`}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </a>
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {record.item?.wowheadId ? (
                          <a
                            href={`https://www.wowhead.com/item=${record.item.wowheadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wowhead={`item=${record.item.wowheadId}`}
                            className="hover:underline"
                          >
                            {record.item?.name || 'Unknown Item'}
                          </a>
                        ) : (
                          record.item?.name || 'Unknown Item'
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.lootDate).toLocaleDateString()}
                        {record.phase && ` • ${record.phase}`}
                      </div>
                    </div>

                    {/* Response badge */}
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${getResponseColor(record.response)}20`,
                        color: getResponseColor(record.response)
                      }}
                    >
                      {RESPONSE_TYPES.find(t => t.value === record.response)?.label || record.response}
                    </span>

                    {/* Points */}
                    {record.lootPoints > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {record.lootPoints} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a player to view their loot history
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Loot Distribution by Class */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Loot Distribution by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lootByClass.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loot data yet
              </div>
            ) : (
              <div className="space-y-3">
                {lootByClass.map((item) => (
                  <div key={item.class} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: item.color }} className="font-medium">{item.class}</span>
                      <span className="text-muted-foreground">{item.count} items</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.count / maxLoot) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loot by Response Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Loot by Response Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lootByResponse.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loot data yet
              </div>
            ) : (
              <div className="space-y-3">
                {lootByResponse.map((item) => (
                  <div key={item.value} className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: item.color }}>{item.label}</span>
                        <span className="text-sm text-muted-foreground">{item.count} ({item.percent}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Loot Receivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Loot Receivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLootReceivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loot data yet
              </div>
            ) : (
              <div className="space-y-3">
                {topLootReceivers.map((player, index) => (
                  <div key={player.name} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">
                        {player.name}
                      </span>
                      <p className="text-xs text-muted-foreground">{player.class}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{player.items} items</div>
                      <div className="text-xs text-muted-foreground">{player.points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Leaders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Attendance Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance data yet
              </div>
            ) : (
              <div className="space-y-3">
                {players
                  .sort((a, b) => b.attendancePercent - a.attendancePercent)
                  .slice(0, 5)
                  .map((player, index) => (
                    <div key={player.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">
                            {player.name}
                          </span>
                          <span className={`font-bold ${player.attendancePercent >= 90 ? 'text-green-500' : player.attendancePercent >= 75 ? 'text-yellow-500' : 'text-orange-500'}`}>
                            {player.attendancePercent}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${player.attendancePercent >= 90 ? 'bg-green-500' : player.attendancePercent >= 75 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                            style={{ width: `${player.attendancePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
