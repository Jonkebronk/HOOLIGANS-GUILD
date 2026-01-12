'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sword, Calendar, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getItemIconUrl, getClassIconUrl, ITEM_QUALITY_COLORS, refreshWowheadTooltips } from '@/lib/wowhead';

// Class Discord server links
const CLASS_DISCORDS: { name: string; url: string }[] = [
  { name: 'Druid', url: 'https://discord.com/invite/SMwmrBV' },
  { name: 'Hunter', url: 'https://discord.gg/ZRxGpQuY9y' },
  { name: 'Mage', url: 'https://discord.com/invite/tEdQhsH' },
  { name: 'Paladin', url: 'https://discord.gg/lightclubclassic' },
  { name: 'Priest', url: 'https://discord.com/invite/MXPeww3' },
  { name: 'Rogue', url: 'https://discord.com/invite/mkfKCBB' },
  { name: 'Shaman', url: 'https://discord.com/invite/VvBwBu2' },
  { name: 'Warlock', url: 'https://discord.com/invite/D6TrRkq' },
  { name: 'Warrior', url: 'https://discord.com/invite/RbCZJtw' },
];

// WeakAura links from Wago.io
const WEAKAURA_LINKS: { name: string; url: string; isClass?: boolean }[] = [
  { name: 'General', url: 'https://wago.io/search/imports/wow/tbc-weakaura/' },
  { name: 'Rocket Boots', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=rocket%2Bboots' },
  { name: 'Druid', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Druid', isClass: true },
  { name: 'Hunter', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Hunter', isClass: true },
  { name: 'Mage', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Mage', isClass: true },
  { name: 'Paladin', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Paladin', isClass: true },
  { name: 'Priest', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Priest', isClass: true },
  { name: 'Rogue', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Rogue', isClass: true },
  { name: 'Shaman', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Shaman', isClass: true },
  { name: 'Warlock', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Warlock', isClass: true },
  { name: 'Warrior', url: 'https://wago.io/search/imports/wow/tbc-weakaura?q=Warrior', isClass: true },
];

import { useTeam } from '@/components/providers/team-provider';

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
  const { selectedTeam } = useTeam();
  const [recentLoot, setRecentLoot] = useState<LootRecord[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      Promise.all([fetchRecentLoot(), fetchPlayers()]).finally(() => setLoading(false));
    }
  }, [selectedTeam]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [recentLoot]);

  const fetchRecentLoot = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/loot?teamId=${selectedTeam.id}`);
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
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/players?teamId=${selectedTeam.id}`);
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

      <Card>
        <CardHeader>
          <CardTitle>Class Discords</CardTitle>
          <CardDescription>Join your class community for guides, theorycrafting, and more</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {CLASS_DISCORDS.map((cls) => (
              <a
                key={cls.name}
                href={cls.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <img
                  src={getClassIconUrl(cls.name)}
                  alt={cls.name}
                  className="w-10 h-10 rounded"
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: CLASS_COLORS[cls.name] || '#888',
                  }}
                />
                <span
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: CLASS_COLORS[cls.name] }}
                >
                  {cls.name}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>Useful tools for TBC Classic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://www.wowsims.com/tbc/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-4 py-3 group"
            >
              <img
                src="https://www.wowsims.com/tbc/assets/img/logo.png"
                alt="WoWSims"
                className="w-8 h-8"
              />
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  WoWSims TBC
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground">Gear optimizer & simulator</p>
              </div>
            </a>
            <a
              href="https://www.youtube.com/watch?v=5wYOVq0s9wY"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-4 py-3 group"
            >
              <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  How to Sim Guide
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground">Video tutorial for WoWSims</p>
              </div>
            </a>
            <a
              href="https://www.wowhead.com/tbc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-4 py-3 group"
            >
              <img
                src="https://wow.zamimg.com/images/logos/wh-mark-80x80.png"
                alt="Wowhead"
                className="w-8 h-8"
              />
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Wowhead TBC
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground">Database, guides & news</p>
              </div>
            </a>
            <a
              href="https://fresh.warcraftlogs.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-4 py-3 group"
            >
              <img
                src="https://assets.rpglogs.com/img/warcraft/favicon.png"
                alt="Warcraft Logs"
                className="w-8 h-8"
              />
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Warcraft Logs
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground">Combat logs & rankings</p>
              </div>
            </a>
            <a
              href="https://sixtyupgrades.com/tbc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-4 py-3 group"
            >
              <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">60</span>
              </div>
              <div>
                <p className="font-medium text-sm flex items-center gap-1">
                  Sixty Upgrades
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground">Gear planner & upgrades</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WeakAuras</CardTitle>
          <CardDescription>Browse TBC WeakAuras on Wago.io</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WEAKAURA_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors px-3 py-2 group"
              >
                {link.isClass ? (
                  <img
                    src={getClassIconUrl(link.name)}
                    alt={link.name}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">W</span>
                  </div>
                )}
                <span
                  className="text-xs font-medium flex items-center gap-1"
                  style={{ color: link.isClass ? CLASS_COLORS[link.name] : undefined }}
                >
                  {link.name}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

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
            <LeadershipBadge name="Shredd" role="Officer" />
            <LeadershipBadge name="Viktorin" role="Officer" />
            <LeadershipBadge name="Ambo" role="Officer" />
            <LeadershipBadge name="Quest" role="Officer" />
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
