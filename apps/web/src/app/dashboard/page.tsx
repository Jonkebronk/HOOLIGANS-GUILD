'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sword, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getItemIconUrl, ITEM_QUALITY_COLORS, refreshWowheadTooltips } from '@/lib/wowhead';

type LootRecord = {
  id: string;
  lootDate: string;
  response: string;
  item: {
    id: string;
    name: string;
    wowheadId: number;
    icon?: string;
    quality: number;
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

const RESPONSE_LABELS: Record<string, string> = {
  BiS: 'BiS',
  GreaterUpgrade: 'Greater Upgrade',
  MinorUpgrade: 'Minor Upgrade',
  Offspec: 'Offspec',
  PvP: 'PvP',
  Disenchant: 'Disenchant',
};

export default function DashboardPage() {
  const [recentLoot, setRecentLoot] = useState<LootRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRecentLoot(), fetchPlayers()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [recentLoot]);

  const fetchRecentLoot = async () => {
    try {
      const res = await fetch('/api/loot');
      if (res.ok) {
        const data = await res.json();
        // Get the 5 most recent
        setRecentLoot(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch loot:', error);
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

  const stats = [
    {
      name: 'Active Raiders',
      value: players.length.toString(),
      description: 'on roster',
      icon: Users,
      color: 'text-primary',
    },
    {
      name: 'Items Distributed',
      value: recentLoot.length > 0 ? recentLoot.length.toString() : '0',
      description: 'recent items',
      icon: Sword,
      color: 'text-quality-epic',
    },
    {
      name: 'Avg Attendance',
      value: '0%',
      description: 'Last 30 days',
      icon: Calendar,
      color: 'text-accent',
    },
    {
      name: 'BiS Completion',
      value: '0%',
      description: 'Guild average',
      icon: TrendingUp,
      color: 'text-wow-hunter',
    },
  ];

  return (
    <div
      className="space-y-6 min-h-screen -m-6 p-6"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(/images/login-bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here is your guild overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Loot</CardTitle>
            <CardDescription>Latest items distributed by the loot council</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentLoot.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No loot recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                {recentLoot.map((loot) => (
                  <div
                    key={loot.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    {/* Item Icon */}
                    <a
                      href={`https://www.wowhead.com/tbc/item=${loot.item.wowheadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-wowhead={`item=${loot.item.wowheadId}&domain=tbc`}
                    >
                      <img
                        src={getItemIconUrl(loot.item.icon || 'inv_misc_questionmark', 'medium')}
                        alt={loot.item.name}
                        className="w-9 h-9 rounded"
                        style={{
                          borderWidth: 2,
                          borderStyle: 'solid',
                          borderColor: ITEM_QUALITY_COLORS[loot.item.quality] || ITEM_QUALITY_COLORS[4]
                        }}
                      />
                    </a>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://www.wowhead.com/tbc/item=${loot.item.wowheadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-wowhead={`item=${loot.item.wowheadId}&domain=tbc`}
                        className="font-medium hover:underline block truncate"
                        style={{ color: ITEM_QUALITY_COLORS[loot.item.quality] || ITEM_QUALITY_COLORS[4] }}
                      >
                        {loot.item.name}
                      </a>
                      <p className="text-sm">
                        <span style={{ color: CLASS_COLORS[loot.player?.class] }}>{loot.player?.name}</span>
                        <span className="text-muted-foreground"> - {RESPONSE_LABELS[loot.response] || loot.response}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(loot.lootDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loot Council Criteria</CardTitle>
            <CardDescription>How we evaluate loot distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <CriteriaItem
                title="Engagement"
                description="Active participation in raids, strategy discussions, and consistent effort to improve."
              />
              <CriteriaItem
                title="Attendance / Reliability"
                description="Maintaining high presence and being prepared before raids start."
              />
              <CriteriaItem
                title="Performance"
                description="DPS/HPS output, teamwork, following strategies, and handling boss mechanics."
              />
              <CriteriaItem
                title="Magnitude of Upgrade"
                description="How much the item improves the character. BiS items are prioritized."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leadership</CardTitle>
          <CardDescription>Your loot council team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <LeadershipBadge name="Johnnypapa" role="Guildmaster" />
            <LeadershipBadge name="Quest" role="Officer" />
            <LeadershipBadge name="Shredd" role="Officer" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CriteriaItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <h4 className="font-medium text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LeadershipBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2">
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-sm font-medium text-primary">{name.slice(0, 2)}</span>
      </div>
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
