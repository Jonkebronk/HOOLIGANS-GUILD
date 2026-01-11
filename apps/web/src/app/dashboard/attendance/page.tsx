'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Calendar, Users, TrendingUp, CheckCircle, Loader2,
  Download, Trash2, X, ChevronRight, ChevronDown, AlertCircle
} from 'lucide-react';
import { CLASS_COLORS, RAIDS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';
import { useTeam } from '@/components/providers/team-provider';

type AttendanceRecord = {
  id: string;
  raidDate: string;
  raidName: string;
  attended: boolean;
  fullyAttended: boolean;
};

type PlayerWithAttendance = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  discordId?: string;
  totalRaids: number;
  attendedRaids: number;
  attendancePercent: number;
  attendance: AttendanceRecord[];
};

type RecordedRaid = {
  date: string;
  name: string;
  key: string;
};

type ImportedPlayer = {
  name: string;
  discordId?: string;
  class?: string;
  spec?: string;
  matched?: boolean;
  matchedPlayerId?: string;
  matchedPlayerName?: string;
};

export default function AttendancePage() {
  const { selectedTeam } = useTeam();
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [raids, setRaids] = useState<RecordedRaid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Raid Dialog
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [newRaid, setNewRaid] = useState({ name: '', date: '' });
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);

  // Import Dialog
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<'eventId' | 'paste'>('eventId');
  const [eventIdInput, setEventIdInput] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [importedPlayers, setImportedPlayers] = useState<ImportedPlayer[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importRaid, setImportRaid] = useState({ name: '', date: '' });

  // Player Detail View
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [addingRaidForPlayer, setAddingRaidForPlayer] = useState<string | null>(null);
  const [playerRaidToAdd, setPlayerRaidToAdd] = useState({ name: '', date: '' });

  // Raid Management
  const [isRaidManageOpen, setIsRaidManageOpen] = useState(false);
  const [deletingRaid, setDeletingRaid] = useState<RecordedRaid | null>(null);

  useEffect(() => {
    if (selectedTeam) {
      fetchAttendance();
      fetchRaids();
    }
  }, [selectedTeam]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchRaids = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/attendance?raids=true&teamId=${selectedTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setRaids(data);
      }
    } catch (error) {
      console.error('Failed to fetch raids:', error);
    }
  };

  const filteredPlayers = players
    .filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.attendancePercent - a.attendancePercent);

  const avgAttendance = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.attendancePercent, 0) / players.length)
    : 0;
  const perfectAttendance = players.filter(p => p.attendancePercent === 100 && p.totalRaids > 0).length;
  const totalRaidsRecorded = raids.length;

  // Import from Raid Helper
  const extractEventId = (input: string): string => {
    // Handle full URLs: https://raid-helper.dev/event/123456 or just ID
    const urlMatch = input.match(/raid-helper\.dev\/event\/(\d+)/);
    if (urlMatch) return urlMatch[1];
    // Handle plain ID
    const idMatch = input.match(/^(\d+)$/);
    if (idMatch) return idMatch[1];
    return input.trim();
  };

  const handleImportFromEventId = async () => {
    setImporting(true);
    setImportError('');
    setImportedPlayers([]);

    try {
      const eventId = extractEventId(eventIdInput);
      const res = await fetch(`/api/raid-helper?eventId=${eventId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch event from Raid Helper');
      }

      const event = await res.json();

      // Extract signups (filter out Tentative, Absence, Bench)
      const signups = event.signUps || [];
      const validSignups = signups.filter((s: { className?: string }) =>
        s.className && !['Tentative', 'Absence', 'Bench', 'Late'].includes(s.className)
      );

      // Transform and match to roster
      const imported = validSignups.map((signup: { name?: string; specName?: string; odUserId?: string; odMemberId?: string; userId?: string; className?: string; class?: string }) => {
        const playerName = signup.name || signup.specName || 'Unknown';
        const discordId = signup.odUserId || signup.odMemberId || signup.userId;

        // Try to match to existing player
        const matched = players.find(p =>
          p.name.toLowerCase() === playerName.toLowerCase() ||
          (discordId && p.discordId === discordId)
        );

        return {
          name: playerName,
          discordId,
          class: signup.className || signup.class,
          matched: !!matched,
          matchedPlayerId: matched?.id,
          matchedPlayerName: matched?.name,
        };
      });

      setImportedPlayers(imported);

      // Set default raid info from event
      if (event.title) {
        const raidMatch = RAIDS.find(r =>
          event.title.toLowerCase().includes(r.name.toLowerCase())
        );
        if (raidMatch) {
          setImportRaid(prev => ({ ...prev, name: raidMatch.name }));
        }
      }
      if (event.startTime) {
        const date = new Date(event.startTime * 1000).toISOString().split('T')[0];
        setImportRaid(prev => ({ ...prev, date }));
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import from Raid Helper. Check the event ID and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromPaste = async () => {
    setImporting(true);
    setImportError('');
    setImportedPlayers([]);

    try {
      const res = await fetch('/api/raid-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'parse', text: pasteInput }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse signup text');
      }

      const { signups } = await res.json();

      // Match to roster
      const imported = signups.map((signup: { name: string; discordId?: string; class?: string; spec?: string }) => {
        const matched = players.find(p =>
          p.name.toLowerCase() === signup.name.toLowerCase() ||
          (signup.discordId && p.discordId === signup.discordId)
        );

        return {
          ...signup,
          matched: !!matched,
          matchedPlayerId: matched?.id,
          matchedPlayerName: matched?.name,
        };
      });

      setImportedPlayers(imported);
    } catch (error) {
      console.error('Parse error:', error);
      setImportError('Failed to parse signup text. Try a different format.');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importRaid.name || !importRaid.date) {
      setImportError('Please select a raid and date');
      return;
    }

    const matchedPlayerIds = importedPlayers
      .filter(p => p.matched && p.matchedPlayerId)
      .map(p => p.matchedPlayerId!);

    if (matchedPlayerIds.length === 0) {
      setImportError('No players matched to your roster');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          playerIds: matchedPlayerIds,
          raidName: importRaid.name,
          raidDate: importRaid.date,
          attended: true,
        }),
      });

      if (res.ok) {
        setIsImportDialogOpen(false);
        setImportedPlayers([]);
        setEventIdInput('');
        setPasteInput('');
        setImportRaid({ name: '', date: '' });
        fetchAttendance();
        fetchRaids();
      }
    } catch (error) {
      console.error('Failed to record attendance:', error);
      setImportError('Failed to record attendance');
    } finally {
      setImporting(false);
    }
  };

  // Record raid with selected players
  const handleRecordRaid = async () => {
    if (!newRaid.name || !newRaid.date || selectedPlayers.size === 0) return;

    setRecording(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          playerIds: Array.from(selectedPlayers),
          raidName: newRaid.name,
          raidDate: newRaid.date,
          attended: true,
        }),
      });

      if (res.ok) {
        setIsRecordDialogOpen(false);
        setNewRaid({ name: '', date: '' });
        setSelectedPlayers(new Set());
        fetchAttendance();
        fetchRaids();
      }
    } catch (error) {
      console.error('Failed to record raid:', error);
    } finally {
      setRecording(false);
    }
  };

  // Add raid for individual player
  const handleAddRaidForPlayer = async (playerId: string) => {
    if (!playerRaidToAdd.name || !playerRaidToAdd.date) return;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          raidName: playerRaidToAdd.name,
          raidDate: playerRaidToAdd.date,
          attended: true,
        }),
      });

      if (res.ok) {
        setAddingRaidForPlayer(null);
        setPlayerRaidToAdd({ name: '', date: '' });
        fetchAttendance();
        fetchRaids();
      }
    } catch (error) {
      console.error('Failed to add raid:', error);
    }
  };

  // Delete attendance record
  const handleDeleteAttendance = async (playerId: string, record: AttendanceRecord) => {
    try {
      const date = new Date(record.raidDate).toISOString().split('T')[0];
      const res = await fetch(
        `/api/attendance?playerId=${playerId}&raidDate=${date}&raidName=${encodeURIComponent(record.raidName)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        fetchAttendance();
        fetchRaids();
      }
    } catch (error) {
      console.error('Failed to delete attendance:', error);
    }
  };

  // Delete entire raid
  const handleDeleteRaid = async (raid: RecordedRaid) => {
    try {
      const res = await fetch(
        `/api/attendance?raidDate=${raid.date}&raidName=${encodeURIComponent(raid.name)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setDeletingRaid(null);
        fetchAttendance();
        fetchRaids();
      }
    } catch (error) {
      console.error('Failed to delete raid:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.size === players.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(players.map(p => p.id)));
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Track raid attendance and participation</p>
        </div>
        <div className="flex gap-2">
          {/* Import from Raid Helper */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />Import from Raid Helper
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Attendance from Raid Helper</DialogTitle>
                <DialogDescription>
                  Import players from a Raid Helper event and record their attendance.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'eventId' | 'paste')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="eventId">Event ID / URL</TabsTrigger>
                  <TabsTrigger value="paste">Paste Signups</TabsTrigger>
                </TabsList>

                <TabsContent value="eventId" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Raid Helper Event ID or URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="123456789 or https://raid-helper.dev/event/123456789"
                        value={eventIdInput}
                        onChange={(e) => setEventIdInput(e.target.value)}
                      />
                      <Button onClick={handleImportFromEventId} disabled={!eventIdInput || importing}>
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Paste Signup Text</Label>
                    <textarea
                      className="w-full h-32 p-3 rounded-md border bg-background text-sm font-mono"
                      placeholder="Paste the signup list from Discord..."
                      value={pasteInput}
                      onChange={(e) => setPasteInput(e.target.value)}
                    />
                    <Button onClick={handleImportFromPaste} disabled={!pasteInput || importing}>
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {importError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{importError}</span>
                </div>
              )}

              {importedPlayers.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Raid</Label>
                      <Select
                        value={importRaid.name}
                        onValueChange={(v) => setImportRaid(prev => ({ ...prev, name: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select raid" /></SelectTrigger>
                        <SelectContent>
                          {RAIDS.map((raid) => (
                            <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={importRaid.date}
                        onChange={(e) => setImportRaid(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Matched Players ({importedPlayers.filter(p => p.matched).length}/{importedPlayers.length})</Label>
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
                      {importedPlayers.map((player, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            player.matched ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}
                        >
                          <span>{player.name}</span>
                          <span className={player.matched ? 'text-green-500' : 'text-red-500'}>
                            {player.matched ? `→ ${player.matchedPlayerName}` : 'Not on roster'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={importedPlayers.filter(p => p.matched).length === 0 || !importRaid.name || !importRaid.date || importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Record {importedPlayers.filter(p => p.matched).length} Attendees
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Record Raid Dialog */}
          <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Record Raid</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Raid Attendance</DialogTitle>
                <DialogDescription>Select players who attended this raid.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raid">Raid</Label>
                    <Select
                      value={newRaid.name}
                      onValueChange={(value) => setNewRaid({ ...newRaid, name: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select raid" /></SelectTrigger>
                      <SelectContent>
                        {RAIDS.map((raid) => (
                          <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newRaid.date}
                      onChange={(e) => setNewRaid({ ...newRaid, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Attendees ({selectedPlayers.size}/{players.length})</Label>
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedPlayers.size === players.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          const newSet = new Set(selectedPlayers);
                          if (newSet.has(player.id)) {
                            newSet.delete(player.id);
                          } else {
                            newSet.add(player.id);
                          }
                          setSelectedPlayers(newSet);
                        }}
                      >
                        <Checkbox checked={selectedPlayers.has(player.id)} />
                        <img
                          src={getSpecIconUrl(player.mainSpec)}
                          alt={player.mainSpec}
                          className="w-6 h-6 rounded"
                        />
                        <span style={{ color: CLASS_COLORS[player.class] }}>{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleRecordRaid}
                  disabled={!newRaid.name || !newRaid.date || selectedPlayers.size === 0 || recording}
                >
                  {recording ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Record {selectedPlayers.size} Attendees
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
        <Card
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsRaidManageOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raids</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRaidsRecorded}</div>
            <p className="text-xs text-muted-foreground">click to manage</p>
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

      {/* Raid Management Dialog */}
      <Dialog open={isRaidManageOpen} onOpenChange={setIsRaidManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Recorded Raids</DialogTitle>
            <DialogDescription>View and delete recorded raids.</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {raids.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No raids recorded yet.</p>
            ) : (
              raids.map((raid) => (
                <div
                  key={raid.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{raid.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(raid.date).toLocaleDateString()}
                    </p>
                  </div>
                  {deletingRaid?.key === raid.key ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRaid(raid)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingRaid(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingRaid(raid)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Attendance Data Yet</h3>
              <p className="text-muted-foreground mb-4">Add players to your roster and start recording raid attendance.</p>
              <Button onClick={() => setIsRecordDialogOpen(true)}>
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
                <Input
                  type="search"
                  placeholder="Search players..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div key={player.id}>
                  <div
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                  >
                    {expandedPlayerId === player.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <img
                      src={getSpecIconUrl(player.mainSpec)}
                      alt={player.mainSpec}
                      className="w-8 h-8 rounded"
                      style={{ borderColor: CLASS_COLORS[player.class], borderWidth: 2 }}
                    />
                    <div className="flex-1">
                      <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium">
                        {player.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {player.attendedRaids}/{player.totalRaids} raids
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        player.attendancePercent >= 90 ? 'text-green-500' :
                        player.attendancePercent >= 75 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {player.attendancePercent}%
                      </span>
                    </div>
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          player.attendancePercent >= 90 ? 'bg-green-500' :
                          player.attendancePercent >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${player.attendancePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded Player Detail */}
                  {expandedPlayerId === player.id && (
                    <div className="ml-8 mt-2 p-4 rounded-lg bg-muted/20 border border-muted">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Raid History</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingRaidForPlayer(player.id);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />Add Raid
                        </Button>
                      </div>

                      {/* Add Raid Form */}
                      {addingRaidForPlayer === player.id && (
                        <div className="mb-4 p-3 rounded-lg bg-background border">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <Select
                              value={playerRaidToAdd.name}
                              onValueChange={(v) => setPlayerRaidToAdd(prev => ({ ...prev, name: v }))}
                            >
                              <SelectTrigger><SelectValue placeholder="Raid" /></SelectTrigger>
                              <SelectContent>
                                {RAIDS.map((raid) => (
                                  <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              value={playerRaidToAdd.date}
                              onChange={(e) => setPlayerRaidToAdd(prev => ({ ...prev, date: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddRaidForPlayer(player.id);
                              }}
                              disabled={!playerRaidToAdd.name || !playerRaidToAdd.date}
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingRaidForPlayer(null);
                                setPlayerRaidToAdd({ name: '', date: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Attended Raids List */}
                      {player.attendance.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No raids attended yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {player.attendance.filter(a => a.attended).map((record) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-2 rounded bg-green-500/10 text-sm"
                            >
                              <div>
                                <span className="font-medium">{record.raidName}</span>
                                <span className="text-muted-foreground ml-2">
                                  {new Date(record.raidDate).toLocaleDateString()}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAttendance(player.id, record);
                                }}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
