'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Users, Package, Calendar, Award, Target, Loader2 } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';

type LootRecord = {
  id: string;
  response: string;
  lootPoints: number;
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
};

const RESPONSE_TYPES = [
  { value: 'BiS', label: 'BiS', color: '#a855f7' },
  { value: 'GreaterUpgrade', label: 'Greater Upgrade', color: '#3b82f6' },
  { value: 'MinorUpgrade', label: 'Minor Upgrade', color: '#22c55e' },
  { value: 'Offspec', label: 'Offspec', color: '#eab308' },
  { value: 'Disenchant', label: 'Disenchant', color: '#6b7280' },
];

export default function ReportsPage() {
  const [lootRecords, setLootRecords] = useState<LootRecord[]>([]);
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchLootRecords(), fetchAttendance()]).finally(() => setLoading(false));
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

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analytics and insights for loot distribution</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start adding players, recording loot, and tracking attendance to see reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Analytics and insights for loot distribution</p>
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
