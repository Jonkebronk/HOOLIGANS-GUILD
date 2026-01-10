'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, X, Camera, Copy, RotateCcw, Download, Send, Plus, Loader2, Upload, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
  discordId?: string;
};

type RaidHelperSignup = {
  name: string;
  discordId?: string;
  class?: string;
  spec?: string;
  role?: string;
};

type GroupSlot = Player | null;
type RaidGroups = GroupSlot[][];

export default function RaidSplitsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [raidSize, setRaidSize] = useState<'10' | '25'>('25');
  const [raidName, setRaidName] = useState('25-Man Raid 1');
  const [isDiscordDialogOpen, setIsDiscordDialogOpen] = useState(false);
  const [discordChannel, setDiscordChannel] = useState('');
  const [messageTitle, setMessageTitle] = useState('');

  // Raid-Helper import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<'event' | 'paste'>('event');
  const [eventId, setEventId] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedSignups, setImportedSignups] = useState<RaidHelperSignup[]>([]);

  const numGroups = raidSize === '25' ? 5 : 2;
  const slotsPerGroup = 5;

  const [groups, setGroups] = useState<RaidGroups>(() =>
    Array(numGroups).fill(null).map(() => Array(slotsPerGroup).fill(null))
  );

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

  const assignedPlayerIds = new Set(groups.flat().filter(Boolean).map(p => p!.id));
  const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id));

  const totalAssigned = groups.flat().filter(Boolean).length;
  const maxPlayers = numGroups * slotsPerGroup;

  const addPlayerToGroup = (groupIndex: number, player: Player) => {
    const newGroups = [...groups];
    const emptySlotIndex = newGroups[groupIndex].findIndex(slot => slot === null);
    if (emptySlotIndex !== -1) {
      newGroups[groupIndex][emptySlotIndex] = player;
      setGroups(newGroups);
    }
  };

  const removePlayerFromGroup = (groupIndex: number, slotIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex][slotIndex] = null;
    setGroups(newGroups);
  };

  const clearAllGroups = () => {
    setGroups(Array(numGroups).fill(null).map(() => Array(slotsPerGroup).fill(null)));
  };

  const handleRaidSizeChange = (size: '10' | '25') => {
    setRaidSize(size);
    const newNumGroups = size === '25' ? 5 : 2;
    setGroups(Array(newNumGroups).fill(null).map(() => Array(slotsPerGroup).fill(null)));
    setRaidName(size === '25' ? '25-Man Raid 1' : '10-Man Raid 1');
  };

  const openDiscordDialog = () => {
    setMessageTitle(`${raidName} - Raid Composition`);
    setIsDiscordDialogOpen(true);
  };

  const handleImportFromRaidHelper = async () => {
    setIsImporting(true);
    try {
      if (importMode === 'event' && eventId) {
        // Extract event ID from URL if full URL is pasted
        let cleanEventId = eventId;
        if (eventId.includes('/')) {
          const match = eventId.match(/events?\/(\d+)/);
          if (match) cleanEventId = match[1];
        }

        const res = await fetch(`/api/raid-helper?eventId=${cleanEventId}`);
        if (res.ok) {
          const event = await res.json();
          // Transform signups from Raid-Helper format
          if (event.signUps) {
            const signups: RaidHelperSignup[] = event.signUps.map((s: Record<string, unknown>) => ({
              name: s.name || s.specName || 'Unknown',
              discordId: s.odUserId || s.userId,
              class: s.className,
              spec: s.specName,
              role: s.role,
            }));
            setImportedSignups(signups);
          }
        } else {
          alert('Failed to fetch event. Check the event ID.');
        }
      } else if (importMode === 'paste' && pasteText) {
        const res = await fetch('/api/raid-helper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'parse', text: pasteText }),
        });
        if (res.ok) {
          const data = await res.json();
          setImportedSignups(data.signups || []);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import signups');
    } finally {
      setIsImporting(false);
    }
  };

  const applyImportedSignups = () => {
    // Create temporary players from imported signups
    const tempPlayers: Player[] = importedSignups.map((signup, index) => ({
      id: `imported-${index}`,
      name: signup.name,
      class: signup.class || 'Unknown',
      mainSpec: signup.spec || signup.class || 'Unknown',
      role: signup.role || 'DPS',
      discordId: signup.discordId,
    }));

    // Add to available players (merge with existing)
    setPlayers(prev => {
      const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
      const newPlayers = tempPlayers.filter(p => !existingNames.has(p.name.toLowerCase()));
      return [...prev, ...newPlayers];
    });

    setIsImportDialogOpen(false);
    setImportedSignups([]);
    setEventId('');
    setPasteText('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Raid Compositions</h1>
            <p className="text-muted-foreground">Build and manage raid groups</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add players to your roster first to build raid compositions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raid Compositions</h1>
          <p className="text-muted-foreground">Build and manage raid groups</p>
        </div>
        <div className="flex gap-2">
          <Button variant={raidSize === '10' ? 'default' : 'outline'} onClick={() => handleRaidSizeChange('10')}>10-Man</Button>
          <Button variant={raidSize === '25' ? 'default' : 'outline'} onClick={() => handleRaidSizeChange('25')}>25-Man</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Raid Groups */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Input value={raidName} onChange={(e) => setRaidName(e.target.value)} className="w-48 font-semibold" />
                  <span className="text-muted-foreground">{totalAssigned}/{maxPlayers}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Copy"><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Reset" onClick={clearAllGroups}><RotateCcw className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Screenshot" onClick={openDiscordDialog}><Camera className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Export"><Download className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${raidSize === '25' ? 'grid-cols-5' : 'grid-cols-2'}`}>
                {groups.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Group {groupIndex + 1}</span>
                    </div>
                    <div className="space-y-1">
                      {group.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className={`flex items-center gap-2 p-1.5 rounded-md ${
                            slot ? 'border border-border' : 'border border-dashed border-muted-foreground/30'
                          }`}
                          style={slot ? {
                            background: `linear-gradient(90deg, ${CLASS_COLORS[slot.class]}25 0%, transparent 100%)`,
                            borderLeft: `3px solid ${CLASS_COLORS[slot.class]}`,
                          } : undefined}
                        >
                          {slot ? (
                            <>
                              <img
                                src={getSpecIconUrl(slot.mainSpec)}
                                alt={slot.mainSpec}
                                className="w-7 h-7 rounded"
                              />
                              <span
                                className="flex-1 text-sm font-medium truncate"
                                style={{ color: CLASS_COLORS[slot.class] }}
                              >
                                {slot.name}
                              </span>
                              <button
                                onClick={() => removePlayerFromGroup(groupIndex, slotIndex)}
                                className="text-red-500 hover:text-red-400 p-0.5"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground/50 w-full text-center py-1">Empty</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Characters */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Available Characters
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">{unassignedPlayers.length} available</span>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-0.5">
              {unassignedPlayers.map((player) => {
                const specName = player.mainSpec?.replace(player.class, '').trim().replace(/([A-Z])/g, ' $1').trim();
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      const groupWithSpace = groups.findIndex(g => g.some(s => s === null));
                      if (groupWithSpace !== -1) {
                        addPlayerToGroup(groupWithSpace, player);
                      }
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left w-full"
                  >
                    <img
                      src={getSpecIconUrl(player.mainSpec)}
                      alt={player.mainSpec}
                      className="w-9 h-9 rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-semibold truncate block"
                        style={{ color: CLASS_COLORS[player.class] }}
                      >
                        {player.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {specName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discord Screenshot Dialog */}
      <Dialog open={isDiscordDialogOpen} onOpenChange={setIsDiscordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Screenshot to Discord
            </DialogTitle>
            <DialogDescription>Share the raid composition to a Discord channel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Channel</Label>
              <Select value={discordChannel} onValueChange={setDiscordChannel}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="raid-signups"># raid-signups</SelectItem>
                  <SelectItem value="officer-chat"># officer-chat</SelectItem>
                  <SelectItem value="general"># general</SelectItem>
                  <SelectItem value="media"># media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Title</Label>
              <Input value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} placeholder="Raid composition title" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscordDialogOpen(false)}>Cancel</Button>
            <Button disabled={!discordChannel}>
              <Send className="h-4 w-4 mr-2" />Send Screenshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raid-Helper Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import from Raid-Helper
            </DialogTitle>
            <DialogDescription>
              Import signups from a Raid-Helper event or paste signup text from Discord.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={importMode === 'event' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('event')}
              >
                Event ID
              </Button>
              <Button
                variant={importMode === 'paste' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('paste')}
              >
                <FileText className="h-4 w-4 mr-1" />
                Paste Text
              </Button>
            </div>

            {importMode === 'event' ? (
              <div className="space-y-2">
                <Label>Raid-Helper Event ID or URL</Label>
                <Input
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="e.g., 123456789 or full event URL"
                />
                <p className="text-xs text-muted-foreground">
                  Find the event ID in the Raid-Helper message or dashboard URL
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste Raid-Helper Signups</Label>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the signup list from Discord here..."
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Copy the signup list from the Raid-Helper Discord message
                </p>
              </div>
            )}

            {importedSignups.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({importedSignups.length} signups)</Label>
                <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 space-y-1">
                  {importedSignups.slice(0, 10).map((signup, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{signup.name}</span>
                      {signup.class && (
                        <span className="text-xs text-muted-foreground">
                          {signup.class} {signup.spec}
                        </span>
                      )}
                      {signup.discordId && (
                        <span className="text-xs text-green-500">✓ Discord ID</span>
                      )}
                    </div>
                  ))}
                  {importedSignups.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      ...and {importedSignups.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            {importedSignups.length > 0 ? (
              <Button onClick={applyImportedSignups}>
                <Plus className="h-4 w-4 mr-2" />
                Add {importedSignups.length} Players
              </Button>
            ) : (
              <Button
                onClick={handleImportFromRaidHelper}
                disabled={isImporting || (importMode === 'event' ? !eventId : !pasteText)}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isImporting ? 'Importing...' : 'Fetch Signups'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
