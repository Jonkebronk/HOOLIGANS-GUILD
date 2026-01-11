'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, Filter, Users, Loader2, LayoutGrid, List } from 'lucide-react';
import { CLASS_COLORS, CLASS_SPECS, SPEC_ROLES } from '@hooligans/shared';
import { PlayerCard } from '@/components/roster/player-card';
import { getSpecIconUrl } from '@/lib/wowhead';

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  offSpec?: string;
  role: string;
  roleSubtype: string;
  notes?: string;
  active: boolean;
};

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

export default function RosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', wowClass: '', mainSpec: '', notes: '', discordId: '' });
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.name || !newPlayer.mainSpec) return;

    setSaving(true);
    try {
      const specRole = SPEC_ROLES[newPlayer.mainSpec];
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayer.name,
          wowClass: newPlayer.wowClass,
          mainSpec: newPlayer.mainSpec,
          role: specRole?.role || 'DPS',
          roleSubtype: specRole?.subtype || 'DPS_Melee',
          notes: newPlayer.notes || null,
          discordId: newPlayer.discordId || null,
        }),
      });

      if (res.ok) {
        const player = await res.json();
        setPlayers([...players, player]);
        setNewPlayer({ name: '', wowClass: '', mainSpec: '', notes: '', discordId: '' });
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to add player:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || player.class === classFilter;
    let matchesRole = roleFilter === 'all';
    if (roleFilter === 'Tank') matchesRole = player.role === 'Tank';
    if (roleFilter === 'Heal') matchesRole = player.role === 'Heal';
    if (roleFilter === 'DPS_Melee') matchesRole = player.role === 'DPS' && player.roleSubtype === 'DPS_Melee';
    if (roleFilter === 'DPS_Ranged') matchesRole = player.role === 'DPS' && player.roleSubtype === 'DPS_Ranged';
    return matchesSearch && matchesClass && matchesRole;
  });

  // Group players by role for list view
  const groupedPlayers = {
    Tank: filteredPlayers.filter(p => p.role === 'Tank'),
    Heal: filteredPlayers.filter(p => p.role === 'Heal'),
    Melee: filteredPlayers.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Melee'),
    Ranged: filteredPlayers.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Ranged'),
  };


  const availableSpecs = newPlayer.wowClass ? CLASS_SPECS[newPlayer.wowClass] || [] : [];

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
          <h1 className="text-2xl font-bold">Roster</h1>
          <p className="text-muted-foreground">Manage your guild members and their specs</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Player</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
              <DialogDescription>Add a new raider to your guild roster.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Character Name</Label>
                <Input id="name" value={newPlayer.name} onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })} placeholder="Enter character name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={newPlayer.wowClass} onValueChange={(value) => setNewPlayer({ ...newPlayer, wowClass: value, mainSpec: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {WOW_CLASSES.map((cls) => (<SelectItem key={cls} value={cls}><span style={{ color: CLASS_COLORS[cls] }}>{cls}</span></SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spec">Main Spec</Label>
                <Select value={newPlayer.mainSpec} onValueChange={(value) => setNewPlayer({ ...newPlayer, mainSpec: value })} disabled={!newPlayer.wowClass}>
                  <SelectTrigger><SelectValue placeholder="Select spec" /></SelectTrigger>
                  <SelectContent>
                    {availableSpecs.map((spec) => (<SelectItem key={spec} value={spec}>{spec.replace(newPlayer.wowClass, '')}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" value={newPlayer.notes} onChange={(e) => setNewPlayer({ ...newPlayer, notes: e.target.value })} placeholder="e.g., BiS wep P1-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discordId">Discord ID (optional)</Label>
                <Input id="discordId" value={newPlayer.discordId} onChange={(e) => setNewPlayer({ ...newPlayer, discordId: e.target.value })} placeholder="e.g., 123456789012345678" />
                <p className="text-xs text-muted-foreground">Right-click user in Discord → Copy User ID (enable Developer Mode in settings)</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPlayer} disabled={!newPlayer.name || !newPlayer.mainSpec || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search players..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {WOW_CLASSES.map((cls) => (<SelectItem key={cls} value={cls}><span style={{ color: CLASS_COLORS[cls] }}>{cls}</span></SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Tank">
                  <div className="flex items-center gap-2">
                    <img src="/icons/roles/tank.png" alt="" className="w-4 h-4" />
                    Tank
                  </div>
                </SelectItem>
                <SelectItem value="Heal">
                  <div className="flex items-center gap-2">
                    <img src="/icons/roles/healer.png" alt="" className="w-4 h-4" />
                    Healer
                  </div>
                </SelectItem>
                <SelectItem value="DPS_Melee">
                  <div className="flex items-center gap-2">
                    <img src="/icons/roles/melee.png" alt="" className="w-4 h-4" />
                    Melee DPS
                  </div>
                </SelectItem>
                <SelectItem value="DPS_Ranged">
                  <div className="flex items-center gap-2">
                    <img src="/icons/roles/ranged.png" alt="" className="w-4 h-4" />
                    Ranged DPS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
              <p className="text-muted-foreground mb-4">Add your first guild member to get started.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Player
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Showing {filteredPlayers.length} of {players.length} players</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5" title="Tanks">
                <img src="/icons/roles/tank.png" alt="Tank" className="w-5 h-5" />
                <span>{players.filter(p => p.role === 'Tank').length}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Healers">
                <img src="/icons/roles/healer.png" alt="Healer" className="w-5 h-5" />
                <span>{players.filter(p => p.role === 'Heal').length}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Melee DPS">
                <img src="/icons/roles/melee.png" alt="Melee" className="w-5 h-5" />
                <span>{players.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Melee').length}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Ranged DPS">
                <img src="/icons/roles/ranged.png" alt="Ranged" className="w-5 h-5" />
                <span>{players.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Ranged').length}</span>
              </div>
            </div>
          </div>

          {viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={{
                    id: player.id,
                    name: player.name,
                    wowClass: player.class,
                    mainSpec: player.mainSpec,
                    role: player.role,
                    roleSubtype: player.roleSubtype,
                    attendance: 0,
                    bisPercent: 0,
                    active: player.active,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {/* Tank Column */}
              <RoleColumn
                title="Tank"
                icon="/icons/roles/tank.png"
                color="#8B4513"
                players={groupedPlayers.Tank}
              />

              {/* Healer Column */}
              <RoleColumn
                title="Healer"
                icon="/icons/roles/healer.png"
                color="#2E8B57"
                players={groupedPlayers.Heal}
              />

              {/* Melee Column */}
              <RoleColumn
                title="Melee"
                icon="/icons/roles/melee.png"
                color="#8B0000"
                players={groupedPlayers.Melee}
              />

              {/* Ranged Column */}
              <RoleColumn
                title="Ranged"
                icon="/icons/roles/ranged.png"
                color="#4B0082"
                players={groupedPlayers.Ranged}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Role Column Component for List View (4 columns side by side)
function RoleColumn({
  title,
  icon,
  color,
  players,
}: {
  title: string;
  icon: string;
  color: string;
  players: Player[];
}) {
  // Get spec name from mainSpec (e.g., "DruidRestoration" -> "Restoration")
  const getSpecName = (mainSpec: string, playerClass: string) => {
    return mainSpec.replace(playerClass, '').replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div className="flex flex-col">
      {/* Icon */}
      <div className="flex justify-center py-3">
        <div className="w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center">
          <img src={icon} alt="" className="w-8 h-8" />
        </div>
      </div>

      {/* Title Header */}
      <div
        className="text-center py-2 font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {title}
      </div>

      {/* Player Specs */}
      <div className="border-x border-b border-border flex-1">
        {players.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            No players
          </div>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className="px-3 py-2 text-center border-b last:border-b-0 text-sm font-medium"
              style={{
                color: CLASS_COLORS[player.class],
                backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}
            >
              {getSpecName(player.mainSpec, player.class)}
            </div>
          ))
        )}
      </div>

      {/* Count */}
      <div className="text-center py-2 bg-muted/50 border-x border-b border-border text-sm font-semibold">
        {players.length}
      </div>
    </div>
  );
}
