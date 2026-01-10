'use client';

import { useState } from 'react';
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
import { Plus, Search, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { CLASS_COLORS, RAIDS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';

const mockPlayers = [
  { id: '1', name: 'Wiz', wowClass: 'Druid', spec: 'DruidGuardian', attendance: 100, raids: 20, attended: 20 },
  { id: '2', name: 'Johnnypapa', wowClass: 'Rogue', spec: 'RogueCombat', attendance: 100, raids: 20, attended: 20 },
  { id: '3', name: 'Ragefury', wowClass: 'Warrior', spec: 'WarriorFury', attendance: 80, raids: 20, attended: 16 },
  { id: '4', name: 'Kapnozug', wowClass: 'Paladin', spec: 'PaladinRetribution', attendance: 94, raids: 18, attended: 17 },
  { id: '5', name: 'Tel', wowClass: 'Shaman', spec: 'ShamanEnhancement', attendance: 82, raids: 17, attended: 14 },
  { id: '6', name: 'Lejon', wowClass: 'Druid', spec: 'DruidFeral', attendance: 82, raids: 17, attended: 14 },
  { id: '7', name: 'Vicke', wowClass: 'Warrior', spec: 'WarriorFury', attendance: 81, raids: 16, attended: 13 },
  { id: '8', name: 'Eonir', wowClass: 'Hunter', spec: 'HunterBeastMastery', attendance: 100, raids: 20, attended: 20 },
  { id: '9', name: 'Smiker', wowClass: 'Druid', spec: 'DruidRestoration', attendance: 100, raids: 20, attended: 20 },
  { id: '10', name: 'Shredd', wowClass: 'Paladin', spec: 'PaladinProtection', attendance: 100, raids: 20, attended: 20 },
  { id: '11', name: 'Quest', wowClass: 'Paladin', spec: 'PaladinHoly', attendance: 100, raids: 20, attended: 20 },
  { id: '12', name: 'Bibitrix', wowClass: 'Priest', spec: 'PriestHoly', attendance: 100, raids: 20, attended: 20 },
];

const mockRaids = [
  { id: '1', name: 'Sunwell Plateau', date: '2025-01-09', attendees: 25, total: 25 },
  { id: '2', name: 'Sunwell Plateau', date: '2025-01-07', attendees: 24, total: 25 },
  { id: '3', name: 'Black Temple', date: '2025-01-06', attendees: 25, total: 25 },
  { id: '4', name: 'Black Temple', date: '2025-01-04', attendees: 23, total: 25 },
  { id: '5', name: 'Hyjal Summit', date: '2025-01-02', attendees: 25, total: 25 },
];

export default function AttendancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRaid, setNewRaid] = useState({ name: '', date: '' });

  const filteredPlayers = mockPlayers
    .filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.attendance - a.attendance);

  const avgAttendance = Math.round(mockPlayers.reduce((sum, p) => sum + p.attendance, 0) / mockPlayers.length);
  const perfectAttendance = mockPlayers.filter(p => p.attendance === 100).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Track raid attendance and participation</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Raid</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Raid Attendance</DialogTitle>
              <DialogDescription>Log attendance for a raid session.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="raid">Raid</Label>
                <Select value={newRaid.name} onValueChange={(value) => setNewRaid({ ...newRaid, name: value })}>
                  <SelectTrigger><SelectValue placeholder="Select raid" /></SelectTrigger>
                  <SelectContent>
                    {RAIDS.map((raid) => (<SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={newRaid.date} onChange={(e) => setNewRaid({ ...newRaid, date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button disabled={!newRaid.name || !newRaid.date}>Record Raid</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{avgAttendance}%</div>
            <p className="text-xs text-muted-foreground">across all raiders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perfect Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{perfectAttendance}</div>
            <p className="text-xs text-muted-foreground">players at 100%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raids</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRaids.length}</div>
            <p className="text-xs text-muted-foreground">this phase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Raiders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPlayers.length}</div>
            <p className="text-xs text-muted-foreground">on roster</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Player Attendance</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search players..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                  <img src={getSpecIconUrl(player.spec)} alt={player.spec} className="w-8 h-8 rounded" style={{ borderColor: CLASS_COLORS[player.wowClass], borderWidth: 2 }} />
                  <div className="flex-1">
                    <span style={{ color: CLASS_COLORS[player.wowClass] }} className="font-medium">{player.name}</span>
                    <p className="text-xs text-muted-foreground">{player.attended}/{player.raids} raids</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${player.attendance >= 90 ? 'text-green-500' : player.attendance >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{player.attendance}%</span>
                  </div>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${player.attendance >= 90 ? 'bg-green-500' : player.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${player.attendance}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Raids</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRaids.map((raid) => (
                <div key={raid.id} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{raid.name}</span>
                    <span className="text-sm text-muted-foreground">{raid.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(raid.attendees / raid.total) * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{raid.attendees}/{raid.total}</span>
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
