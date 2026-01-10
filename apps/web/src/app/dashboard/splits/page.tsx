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
import { Users, X, Camera, Copy, RotateCcw, Download, Send, Plus, Loader2 } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
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
              <CardTitle className="text-base">Available Characters</CardTitle>
              <span className="text-sm text-muted-foreground">{unassignedPlayers.length} available</span>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-1">
              {unassignedPlayers.map((player) => (
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
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-medium truncate block"
                      style={{ color: CLASS_COLORS[player.class] }}
                    >
                      {player.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {player.mainSpec?.replace(player.class, '').trim()}
                    </span>
                  </div>
                </button>
              ))}
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
    </div>
  );
}
