'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { Plus, Search, Calendar, Users, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { CLASS_COLORS, RAIDS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';

type PlayerWithAttendance = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  totalRaids: number;
  attendedRaids: number;
  attendancePercent: number;
};

export default function AttendancePage() {
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRaid, setNewRaid] = useState({ name: '', date: '' });

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players
    .filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.attendancePercent - a.attendancePercent);

  const avgAttendance = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.attendancePercent, 0) / players.length)
    : 0;
  const perfectAttendance = players.filter(p => p.attendancePercent === 100).length;
  const totalRaidsRecorded = players.length > 0 ? Math.max(...players.map(p => p.totalRaids)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen -m-6">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/attendance-bg.jpg"
          alt="Attendance Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-gray-300">Track raid attendance and participation</p>
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
            <div className={`text-2xl font-bold ${avgAttendance >= 80 ? 'text-green-500' : avgAttendance >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {avgAttendance}%
            </div>
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
            <div className="text-2xl font-bold">{totalRaidsRecorded}</div>
            <p className="text-xs text-muted-foreground">this phase</p>
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
      </div>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Attendance Data Yet</h3>
              <p className="text-muted-foreground mb-4">Add players to your roster and start recording raid attendance.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Record Raid
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
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
                  <img src={getSpecIconUrl(player.mainSpec)} alt={player.mainSpec} className="w-8 h-8 rounded" style={{ borderColor: CLASS_COLORS[player.class], borderWidth: 2 }} />
                  <div className="flex-1">
                    <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">{player.name}</span>
                    <p className="text-xs text-muted-foreground">{player.attendedRaids}/{player.totalRaids} raids</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${player.attendancePercent >= 90 ? 'text-green-500' : player.attendancePercent >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{player.attendancePercent}%</span>
                  </div>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${player.attendancePercent >= 90 ? 'bg-green-500' : player.attendancePercent >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${player.attendancePercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
