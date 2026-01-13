'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Eye, Zap, FlaskConical, Swords, Users } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getClassIconUrl } from '@/lib/wowhead';

import { useTeam } from '@/components/providers/team-provider';

// Raid tier info
const CURRENT_TIER = {
  tier: 'Tier 4',
  raids: ['Karazhan', "Gruul's Lair", "Magtheridon's Lair"],
};

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

export default function DashboardPage() {
  const { selectedTeam } = useTeam();
  const isPuG = selectedTeam?.name?.toLowerCase().includes('pug');

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

      {/* Ready to Pump Card */}
      <Card className="overflow-hidden">
        <div className="flex">
          <div className="flex-1 p-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Ready to Pump?</h2>
            <p className="text-sm text-muted-foreground mb-4">Consumables, items and assignments</p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <span className="text-cyan-400 font-bold text-sm">{CURRENT_TIER.tier}</span>
                <span className="text-sm text-muted-foreground">{CURRENT_TIER.raids.join(', ')}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/consumables"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors text-sm font-medium"
                >
                  <FlaskConical className="w-4 h-4 text-green-400" />
                  <span>Consumables</span>
                </Link>
                <Link
                  href="/dashboard/items"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors text-sm font-medium"
                >
                  <Swords className="w-4 h-4 text-purple-400" />
                  <span>Items</span>
                </Link>
                <Link
                  href="/dashboard/bis"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors text-sm font-medium"
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>BiS Lists</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block w-48 relative">
            <img
              src="/images/pump-arnold.webp"
              alt="Ready to pump"
              className="absolute bottom-0 right-0 h-full object-contain object-bottom opacity-80"
            />
          </div>
        </div>
      </Card>

      {/* Main Grid - Resources, WeakAuras, Class Discords */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Resources Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <a
                href="https://www.wowsims.com/tbc/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
              >
                <img
                  src="https://www.wowsims.com/tbc/assets/img/logo.png"
                  alt="WoWSims"
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium flex-1">WoWSims TBC</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://www.wowhead.com/tbc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
              >
                <img
                  src="https://wow.zamimg.com/images/logos/wh-mark-80x80.png"
                  alt="Wowhead"
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium flex-1">Wowhead TBC</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://fresh.warcraftlogs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
              >
                <img
                  src="https://assets.rpglogs.com/img/warcraft/favicon.png"
                  alt="Warcraft Logs"
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium flex-1">Warcraft Logs</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://sixtyupgrades.com/tbc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
              >
                <div className="w-5 h-5 rounded bg-amber-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">60</span>
                </div>
                <span className="text-sm font-medium flex-1">Sixty Upgrades</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Guides Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Guides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <a
                href="https://www.youtube.com/watch?v=5wYOVq0s9wY"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
              >
                <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium flex-1">How to Sim</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group w-full text-left">
                    <div className="w-5 h-5 rounded bg-green-600 flex items-center justify-center">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium flex-1 text-green-400">Zoom Hack</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-green-500" />
                      Improve your UI!
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Increasing your max zoom distance makes it much easier to avoid damage from projectiles and reduces the chance of messing up tricky movement or skips.
                    </p>
                    <div className="space-y-3 pt-2">
                      <h4 className="font-semibold text-foreground">Console Commands</h4>
                      <div className="space-y-1">
                        <p className="font-medium text-green-400">Zoom Hack:</p>
                        <code className="block bg-secondary px-3 py-2 rounded text-xs font-mono">
                          /console cameraDistanceMaxZoomFactor 2.6
                        </code>
                        <p className="text-xs text-muted-foreground">(Can use higher than 2.6)</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-green-400">Zoom Smoothing:</p>
                        <code className="block bg-secondary px-3 py-2 rounded text-xs font-mono">
                          /console CameraReduceUnexpectedMovement 1
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-green-400">Sharpening Filter:</p>
                        <code className="block bg-secondary px-3 py-2 rounded text-xs font-mono">
                          /console set ResampleAlwaysSharpen 1
                        </code>
                      </div>
                    </div>
                    <a
                      href="https://www.youtube.com/watch?v=OFpHIAe_MS4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-4 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Watch Video Guide</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group w-full text-left">
                    <div className="w-5 h-5 rounded bg-yellow-600 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium flex-1 text-yellow-400">Skip Bar</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      How to be Successful with Skips
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      We use skips in T5, T6 and T6.5 to save time and stay competitive for top progression rankings.
                    </p>
                    <div className="bg-secondary/50 border border-yellow-600/30 rounded-lg p-4">
                      <p className="font-medium text-yellow-400 mb-2">Setup Guide:</p>
                      <a
                        href="https://docs.google.com/spreadsheets/d/1sXsIHAvNk8gkW0ezYBKVnJPwnqcF0g3LmkJqTMP3MEY/edit?gid=1407277678#gid=1407277678"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <span className="font-medium">How to set up Skip Bar</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get set up ahead of time and watch the skip videos in the playbook.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* WeakAuras Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">WeakAuras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {WEAKAURA_LINKS.slice(0, 2).map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors group"
                >
                  <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">W</span>
                  </div>
                  <span className="text-sm font-medium flex-1">{link.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
              <div className="pt-1 border-t border-border mt-1">
                {WEAKAURA_LINKS.slice(2).map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-1 rounded hover:bg-secondary/50 transition-colors group"
                  >
                    <img
                      src={getClassIconUrl(link.name)}
                      alt={link.name}
                      className="w-4 h-4 rounded"
                    />
                    <span
                      className="text-xs font-medium flex-1"
                      style={{ color: CLASS_COLORS[link.name] }}
                    >
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Discords Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Class Discords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {CLASS_DISCORDS.map((cls) => (
                <a
                  key={cls.name}
                  href={cls.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-1 rounded hover:bg-secondary/50 transition-colors group"
                >
                  <img
                    src={getClassIconUrl(cls.name)}
                    alt={cls.name}
                    className="w-5 h-5 rounded"
                    style={{
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: CLASS_COLORS[cls.name] || '#888',
                    }}
                  />
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: CLASS_COLORS[cls.name] }}
                  >
                    {cls.name}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loot Council Criteria - Only show for non-PuG teams */}
      {!isPuG && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Loot Council Criteria</CardTitle>
            <CardDescription>How we evaluate loot distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="border-l-2 border-primary pl-3">
                <h4 className="font-medium text-foreground text-sm">Engagement</h4>
                <p className="text-xs text-muted-foreground">Active participation and effort to improve.</p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <h4 className="font-medium text-foreground text-sm">Attendance</h4>
                <p className="text-xs text-muted-foreground">High presence and being prepared for raids.</p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <h4 className="font-medium text-foreground text-sm">Performance</h4>
                <p className="text-xs text-muted-foreground">DPS/HPS, teamwork, and handling mechanics.</p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <h4 className="font-medium text-foreground text-sm">Upgrade Value</h4>
                <p className="text-xs text-muted-foreground">How much the item improves your character.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leadership */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Leadership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
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

function LeadershipBadge({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-xs font-medium text-primary">{name.slice(0, 2)}</span>
      </div>
      <div>
        <p className="font-medium text-xs">{name}</p>
        <p className="text-[10px] text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
