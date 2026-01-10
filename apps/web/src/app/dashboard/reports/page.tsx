'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Users, Package, Calendar, Award, Target } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';

const lootByClass = [
  { class: 'Druid', count: 24, color: CLASS_COLORS.Druid },
  { class: 'Rogue', count: 18, color: CLASS_COLORS.Rogue },
  { class: 'Warrior', count: 22, color: CLASS_COLORS.Warrior },
  { class: 'Paladin', count: 28, color: CLASS_COLORS.Paladin },
  { class: 'Hunter', count: 15, color: CLASS_COLORS.Hunter },
  { class: 'Priest', count: 20, color: CLASS_COLORS.Priest },
  { class: 'Shaman', count: 16, color: CLASS_COLORS.Shaman },
  { class: 'Mage', count: 12, color: CLASS_COLORS.Mage },
  { class: 'Warlock', count: 14, color: CLASS_COLORS.Warlock },
];

const lootByResponse = [
  { response: 'BiS', count: 45, color: '#a855f7', percent: 27 },
  { response: 'Greater Upgrade', count: 52, color: '#3b82f6', percent: 31 },
  { response: 'Minor Upgrade', count: 38, color: '#22c55e', percent: 23 },
  { response: 'Offspec', count: 25, color: '#eab308', percent: 15 },
  { response: 'Disenchant', count: 9, color: '#6b7280', percent: 4 },
];

const topLootReceivers = [
  { name: 'Shredd', class: 'Paladin', items: 12, points: 1850 },
  { name: 'Smiker', class: 'Druid', items: 11, points: 1720 },
  { name: 'Johnnypapa', class: 'Rogue', items: 10, points: 1650 },
  { name: 'Quest', class: 'Paladin', items: 9, points: 1480 },
  { name: 'Wiz', class: 'Druid', items: 9, points: 1420 },
];

const bisProgress = [
  { name: 'Ragefury', class: 'Warrior', percent: 92 },
  { name: 'Shredd', class: 'Paladin', percent: 91 },
  { name: 'Smiker', class: 'Druid', percent: 88 },
  { name: 'Wiz', class: 'Druid', percent: 85 },
  { name: 'Johnnypapa', class: 'Rogue', percent: 78 },
];

const maxLoot = Math.max(...lootByClass.map(c => c.count));

export default function ReportsPage() {
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
            <div className="text-2xl font-bold">169</div>
            <p className="text-xs text-muted-foreground">this phase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg BiS Completion</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">76%</div>
            <p className="text-xs text-muted-foreground">across roster</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raids This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">93%</div>
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
            <div className="space-y-3">
              {lootByResponse.map((item) => (
                <div key={item.response} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: item.color }}>{item.response}</span>
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
          </CardContent>
        </Card>

        {/* BiS Progress Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              BiS Progress Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bisProgress.map((player, index) => (
                <div key={player.name} className="flex items-center gap-4 p-2 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">
                        {player.name}
                      </span>
                      <span className={`font-bold ${player.percent >= 90 ? 'text-green-500' : player.percent >= 75 ? 'text-yellow-500' : 'text-orange-500'}`}>
                        {player.percent}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${player.percent >= 90 ? 'bg-green-500' : player.percent >= 75 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                        style={{ width: `${player.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
