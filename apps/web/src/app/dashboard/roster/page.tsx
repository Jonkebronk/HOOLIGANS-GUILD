'use client';

import { useState } from 'react';
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
import { Plus, Search, Filter } from 'lucide-react';
import { CLASS_COLORS, CLASS_SPECS } from '@hooligans/shared';
import { PlayerCard } from '@/components/roster/player-card';

const mockPlayers = [
  { id: '1', name: 'Wiz', wowClass: 'Druid', mainSpec: 'DruidGuardian', role: 'Tank', attendance: 100, bisPercent: 85, active: true },
  { id: '2', name: 'Johnnypapa', wowClass: 'Rogue', mainSpec: 'RogueCombat', role: 'DPS', attendance: 100, bisPercent: 78, active: true },
  { id: '3', name: 'Angrypickle', wowClass: 'Warrior', mainSpec: 'WarriorFury', role: 'DPS', attendance: 80, bisPercent: 92, active: true },
  { id: '4', name: 'Kapnozug', wowClass: 'Paladin', mainSpec: 'PaladinRetribution', role: 'DPS', attendance: 94, bisPercent: 71, active: true },
  { id: '5', name: 'Tel', wowClass: 'Shaman', mainSpec: 'ShamanEnhancement', role: 'DPS', attendance: 82, bisPercent: 65, active: true },
  { id: '6', name: 'Lejon', wowClass: 'Druid', mainSpec: 'DruidFeral', role: 'DPS', attendance: 82, bisPercent: 58, active: true },
  { id: '7', name: 'Vicke', wowClass: 'Warrior', mainSpec: 'WarriorFury', role: 'DPS', attendance: 81, bisPercent: 45, active: true },
  { id: '8', name: 'Eonir', wowClass: 'Hunter', mainSpec: 'HunterBeastMastery', role: 'DPS', attendance: 100, bisPercent: 72, active: true },
  { id: '9', name: 'Smiker', wowClass: 'Druid', mainSpec: 'DruidRestoration', role: 'Heal', attendance: 100, bisPercent: 88, active: true },
  { id: '10', name: 'Shredd', wowClass: 'Paladin', mainSpec: 'PaladinProtection', role: 'Tank', attendance: 100, bisPercent: 91, active: true },
  { id: '11', name: 'Quest', wowClass: 'Paladin', mainSpec: 'PaladinHoly', role: 'Heal', attendance: 100, bisPercent: 76, active: true },
  { id: '12', name: 'Bibitrix', wowClass: 'Priest', mainSpec: 'PriestHoly', role: 'Heal', attendance: 100, bisPercent: 69, active: true },
];

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

export default function RosterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', wowClass: '', mainSpec: '', notes: '' });

  const filteredPlayers = mockPlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || player.wowClass === classFilter;
    const matchesRole = roleFilter === 'all' || player.role === roleFilter;
    return matchesSearch && matchesClass && matchesRole;
  });

  const availableSpecs = newPlayer.wowClass ? CLASS_SPECS[newPlayer.wowClass] || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roster</h1>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button disabled={!newPlayer.name || !newPlayer.mainSpec}>Add Player</Button>
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
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Tank">Tank</SelectItem>
                <SelectItem value="Heal">Healer</SelectItem>
                <SelectItem value="DPS">DPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Showing {filteredPlayers.length} of {mockPlayers.length} players</span>
        <span>|</span>
        <span>Tanks: {mockPlayers.filter(p => p.role === 'Tank').length}</span>
        <span>|</span>
        <span>Healers: {mockPlayers.filter(p => p.role === 'Heal').length}</span>
        <span>|</span>
        <span>DPS: {mockPlayers.filter(p => p.role === 'DPS').length}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPlayers.map((player) => (<PlayerCard key={player.id} player={player} />))}
      </div>
    </div>
  );
}
