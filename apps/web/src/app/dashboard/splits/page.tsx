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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, X, Camera, Copy, RotateCcw, Download, Send, Plus } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';

type Player = {
  id: string;
  name: string;
  wowClass: string;
  spec: string;
  role: 'Tank' | 'Heal' | 'DPS';
};

const mockAvailablePlayers: Player[] = [
  { id: '1', name: 'Wiz', wowClass: 'Druid', spec: 'DruidGuardian', role: 'Tank' },
  { id: '2', name: 'Johnnypapa', wowClass: 'Rogue', spec: 'RogueCombat', role: 'DPS' },
  { id: '3', name: 'Ragefury', wowClass: 'Warrior', spec: 'WarriorFury', role: 'DPS' },
  { id: '4', name: 'Kapnozug', wowClass: 'Paladin', spec: 'PaladinRetribution', role: 'DPS' },
  { id: '5', name: 'Tel', wowClass: 'Shaman', spec: 'ShamanEnhancement', role: 'DPS' },
  { id: '6', name: 'Lejon', wowClass: 'Druid', spec: 'DruidFeral', role: 'DPS' },
  { id: '7', name: 'Vicke', wowClass: 'Warrior', spec: 'WarriorFury', role: 'DPS' },
  { id: '8', name: 'Eonir', wowClass: 'Hunter', spec: 'HunterBeastMastery', role: 'DPS' },
  { id: '9', name: 'Smiker', wowClass: 'Druid', spec: 'DruidRestoration', role: 'Heal' },
  { id: '10', name: 'Shredd', wowClass: 'Paladin', spec: 'PaladinProtection', role: 'Tank' },
  { id: '11', name: 'Quest', wowClass: 'Paladin', spec: 'PaladinHoly', role: 'Heal' },
  { id: '12', name: 'Bibitrix', wowClass: 'Priest', spec: 'PriestHoly', role: 'Heal' },
  { id: '13', name: 'Shadowstep', wowClass: 'Rogue', spec: 'RogueCombat', role: 'DPS' },
  { id: '14', name: 'Frostbolt', wowClass: 'Mage', spec: 'MageFrost', role: 'DPS' },
  { id: '15', name: 'Darkfire', wowClass: 'Warlock', spec: 'WarlockDestruction', role: 'DPS' },
  { id: '16', name: 'Moonkin', wowClass: 'Druid', spec: 'DruidBalance', role: 'DPS' },
  { id: '17', name: 'Holybolt', wowClass: 'Priest', spec: 'PriestHoly', role: 'Heal' },
  { id: '18', name: 'Thunderaxe', wowClass: 'Warrior', spec: 'WarriorProtection', role: 'Tank' },
  { id: '19', name: 'Arcaneblast', wowClass: 'Mage', spec: 'MageArcane', role: 'DPS' },
  { id: '20', name: 'Chainlightning', wowClass: 'Shaman', spec: 'ShamanElemental', role: 'DPS' },
];

type GroupSlot = Player | null;
type RaidGroups = GroupSlot[][];

export default function RaidSplitsPage() {
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

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(mockAvailablePlayers);

  const assignedPlayerIds = new Set(groups.flat().filter(Boolean).map(p => p!.id));
  const unassignedPlayers = availablePlayers.filter(p => !assignedPlayerIds.has(p.id));

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
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            slot ? 'bg-muted/50 border-border' : 'border-dashed border-muted-foreground/30'
                          }`}
                        >
                          {slot ? (
                            <>
                              <img
                                src={getSpecIconUrl(slot.spec)}
                                alt={slot.spec}
                                className="w-6 h-6 rounded"
                              />
                              <span
                                className="flex-1 text-sm font-medium truncate"
                                style={{ color: CLASS_COLORS[slot.wowClass] }}
                              >
                                {slot.name}
                              </span>
                              <button
                                onClick={() => removePlayerFromGroup(groupIndex, slotIndex)}
                                className="text-red-500 hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground/50 w-full text-center">Empty</span>
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
            <div className="grid grid-cols-2 gap-1">
              {unassignedPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    const groupWithSpace = groups.findIndex(g => g.some(s => s === null));
                    if (groupWithSpace !== -1) {
                      addPlayerToGroup(groupWithSpace, player);
                    }
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left"
                >
                  <img
                    src={getSpecIconUrl(player.spec)}
                    alt={player.spec}
                    className="w-6 h-6 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-medium truncate block"
                      style={{ color: CLASS_COLORS[player.wowClass] }}
                    >
                      {player.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {player.spec.replace(player.wowClass, '')}
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
