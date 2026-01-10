'use client';

import { useState, useEffect, DragEvent } from 'react';
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
import { Users, Copy, RotateCcw, Download, Plus, Loader2, Upload, FileText, Camera } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getSpecIconUrl } from '@/lib/wowhead';

// WoWSims TBC class colors
const WOWSIMS_CLASS_COLORS: Record<string, string> = {
  Druid: '#ff7d0a',
  Hunter: '#abd473',
  Mage: '#69ccf0',
  Paladin: '#f58cba',
  Priest: '#ffffff',
  Rogue: '#fff569',
  Shaman: '#2459ff',
  Warlock: '#9482c9',
  Warrior: '#c79c6e',
  Unknown: '#808080',
};

// Class order for sidebar grouping
const CLASS_ORDER = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid'];

// Role colors for the category headers
const ROLE_COLORS: Record<string, string> = {
  Tank: '#8B4513',
  Healer: '#2E8B57',
  Melee: '#8B0000',
  Ranged: '#4B0082',
};

// Role icons
const ROLE_ICONS: Record<string, string> = {
  Tank: '/icons/roles/tank.png',
  Healer: '/icons/roles/healer.png',
  Melee: '/icons/roles/melee.png',
  Ranged: '/icons/roles/ranged.png',
};

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
  roleSubtype?: string;
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

type RaidConfig = {
  id: string;
  name: string;
  size: '10' | '25';
  groups: RaidGroups;
};

const SLOTS_PER_GROUP = 5;

export default function RaidSplitsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragSource, setDragSource] = useState<{ raidId: string; groupIndex: number; slotIndex: number } | 'available' | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Raid-Helper import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<'event' | 'paste'>('event');
  const [eventId, setEventId] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedSignups, setImportedSignups] = useState<RaidHelperSignup[]>([]);

  // Multi-raid state: 1x 25-man + 3x 10-man
  const [raids, setRaids] = useState<RaidConfig[]>([
    {
      id: 'main-25',
      name: '25-Man Raid 1',
      size: '25',
      groups: Array(5).fill(null).map(() => Array(SLOTS_PER_GROUP).fill(null)),
    },
    {
      id: 'split-10-1',
      name: '10-Man Split 1',
      size: '10',
      groups: Array(2).fill(null).map(() => Array(SLOTS_PER_GROUP).fill(null)),
    },
    {
      id: 'split-10-2',
      name: '10-Man Split 2',
      size: '10',
      groups: Array(2).fill(null).map(() => Array(SLOTS_PER_GROUP).fill(null)),
    },
    {
      id: 'split-10-3',
      name: '10-Man Split 3',
      size: '10',
      groups: Array(2).fill(null).map(() => Array(SLOTS_PER_GROUP).fill(null)),
    },
  ]);

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

  // Get all players assigned to a specific raid
  const getAssignedPlayerIds = (raidId: string): Set<string> => {
    const raid = raids.find(r => r.id === raidId);
    if (!raid) return new Set();
    return new Set(raid.groups.flat().filter(Boolean).map(p => p!.id));
  };

  // Get unassigned players (not in the 25-man raid)
  const mainRaidAssignedIds = getAssignedPlayerIds('main-25');
  const unassignedPlayers = players.filter(p => !mainRaidAssignedIds.has(p.id));
  const assignedTo25Man = players.filter(p => mainRaidAssignedIds.has(p.id));

  // Group players by class for sidebar
  const groupPlayersByClass = (playerList: Player[]) => {
    const grouped: Record<string, Player[]> = {};
    for (const cls of CLASS_ORDER) {
      const classPlayers = playerList.filter(p => p.class === cls);
      if (classPlayers.length > 0) {
        grouped[cls] = classPlayers;
      }
    }
    // Add unknown class players
    const unknownPlayers = playerList.filter(p => !CLASS_ORDER.includes(p.class));
    if (unknownPlayers.length > 0) {
      grouped['Unknown'] = unknownPlayers;
    }
    return grouped;
  };

  // Group players by role for the role columns view
  const groupPlayersByRole = (playerList: Player[]) => {
    return {
      Tank: playerList.filter(p => p.role === 'Tank'),
      Healer: playerList.filter(p => p.role === 'Heal'),
      Melee: playerList.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Melee'),
      Ranged: playerList.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Ranged'),
    };
  };

  // Get spec name from mainSpec
  const getSpecName = (mainSpec: string, playerClass: string) => {
    return mainSpec.replace(playerClass, '').replace(/([A-Z])/g, ' $1').trim();
  };

  // Drag handlers
  const handleDragStart = (
    e: DragEvent,
    player: Player,
    source: { raidId: string; groupIndex: number; slotIndex: number } | 'available'
  ) => {
    setDraggedPlayer(player);
    setDragSource(source);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', player.id);

    // Set drag image
    const elem = e.currentTarget as HTMLElement;
    if (elem) {
      e.dataTransfer.setDragImage(elem, 0, 0);
    }
  };

  const handleDragOver = (e: DragEvent, slotKey?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (slotKey) {
      setDragOverSlot(slotKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (
    e: DragEvent,
    raidId: string,
    groupIndex: number,
    slotIndex: number
  ) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedPlayer) return;

    setRaids(prevRaids => {
      const newRaids = prevRaids.map(raid => ({
        ...raid,
        groups: raid.groups.map(group => [...group]),
      }));

      const targetRaid = newRaids.find(r => r.id === raidId);
      if (!targetRaid) return prevRaids;

      const alreadyInRaid = targetRaid.groups.flat().some(p => p?.id === draggedPlayer.id);

      if (dragSource && dragSource !== 'available') {
        const sourceRaid = newRaids.find(r => r.id === dragSource.raidId);
        if (sourceRaid) {
          if (dragSource.raidId === raidId) {
            // Swap within same raid
            const targetPlayer = targetRaid.groups[groupIndex][slotIndex];
            targetRaid.groups[groupIndex][slotIndex] = draggedPlayer;
            sourceRaid.groups[dragSource.groupIndex][dragSource.slotIndex] = targetPlayer;
          } else {
            // Move between raids
            sourceRaid.groups[dragSource.groupIndex][dragSource.slotIndex] = null;
            const targetPlayer = targetRaid.groups[groupIndex][slotIndex];
            targetRaid.groups[groupIndex][slotIndex] = draggedPlayer;
            if (targetPlayer) {
              sourceRaid.groups[dragSource.groupIndex][dragSource.slotIndex] = targetPlayer;
            }
          }
        }
      } else if (dragSource === 'available') {
        // From available pool - allow duplicates in 10-mans
        if (raidId.startsWith('split-10') || !alreadyInRaid) {
          if (raidId.startsWith('split-10') && alreadyInRaid) {
            return prevRaids;
          }
          targetRaid.groups[groupIndex][slotIndex] = draggedPlayer;
        }
      }

      return newRaids;
    });

    setDraggedPlayer(null);
    setDragSource(null);
  };

  const handleDropToAvailable = (e: DragEvent) => {
    e.preventDefault();
    if (!draggedPlayer || dragSource === 'available' || !dragSource) return;

    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id === dragSource.raidId) {
          const newGroups = raid.groups.map(group => [...group]);
          newGroups[dragSource.groupIndex][dragSource.slotIndex] = null;
          return { ...raid, groups: newGroups };
        }
        return raid;
      });
    });

    setDraggedPlayer(null);
    setDragSource(null);
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDragSource(null);
    setDragOverSlot(null);
  };

  // Add player to raid on click
  const addPlayerToRaid = (raidId: string, player: Player) => {
    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id !== raidId) return raid;

        const alreadyInRaid = raid.groups.flat().some(p => p?.id === player.id);
        if (alreadyInRaid) return raid;

        const newGroups = raid.groups.map(group => [...group]);
        for (let gi = 0; gi < newGroups.length; gi++) {
          for (let si = 0; si < newGroups[gi].length; si++) {
            if (newGroups[gi][si] === null) {
              newGroups[gi][si] = player;
              return { ...raid, groups: newGroups };
            }
          }
        }
        return raid;
      });
    });
  };

  // Remove player from slot
  const removePlayerFromSlot = (raidId: string, groupIndex: number, slotIndex: number) => {
    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id !== raidId) return raid;
        const newGroups = raid.groups.map(group => [...group]);
        newGroups[groupIndex][slotIndex] = null;
        return { ...raid, groups: newGroups };
      });
    });
  };

  // Clear raid
  const clearRaid = (raidId: string) => {
    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id !== raidId) return raid;
        const numGroups = raid.size === '25' ? 5 : 2;
        return {
          ...raid,
          groups: Array(numGroups).fill(null).map(() => Array(SLOTS_PER_GROUP).fill(null)),
        };
      });
    });
  };

  // Update raid name
  const updateRaidName = (raidId: string, name: string) => {
    setRaids(prevRaids => prevRaids.map(raid =>
      raid.id === raidId ? { ...raid, name } : raid
    ));
  };

  // Get raid stats
  const getRaidCount = (raidId: string): number => {
    const raid = raids.find(r => r.id === raidId);
    return raid ? raid.groups.flat().filter(Boolean).length : 0;
  };

  const getRaidMax = (raidId: string): number => {
    const raid = raids.find(r => r.id === raidId);
    return raid ? raid.groups.length * SLOTS_PER_GROUP : 0;
  };

  // Import handlers
  const handleImportFromRaidHelper = async () => {
    setIsImporting(true);
    try {
      if (importMode === 'event' && eventId) {
        let cleanEventId = eventId;
        if (eventId.includes('/')) {
          const match = eventId.match(/events?\/(\d+)/);
          if (match) cleanEventId = match[1];
        }

        const res = await fetch(`/api/raid-helper?eventId=${cleanEventId}`);
        if (res.ok) {
          const event = await res.json();
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
    const tempPlayers: Player[] = importedSignups.map((signup, index) => ({
      id: `imported-${index}-${Date.now()}`,
      name: signup.name,
      class: signup.class || 'Unknown',
      mainSpec: signup.spec || signup.class || 'Unknown',
      role: signup.role || 'DPS',
      discordId: signup.discordId,
    }));

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

  // Render player slot (WoWSims style)
  const renderPlayerSlot = (
    slot: Player | null,
    raidId: string,
    groupIndex: number,
    slotIndex: number
  ) => {
    const slotKey = `${raidId}-${groupIndex}-${slotIndex}`;
    const isDragOver = dragOverSlot === slotKey;
    const classColor = slot ? WOWSIMS_CLASS_COLORS[slot.class] || WOWSIMS_CLASS_COLORS.Unknown : null;

    return (
      <div
        key={slotKey}
        className={`h-7 flex items-center transition-all cursor-pointer ${
          slot ? '' : 'border border-[#333]'
        } ${isDragOver ? 'ring-2 ring-white/50' : ''}`}
        style={{
          backgroundColor: slot ? classColor || '#333' : '#1a1a1a',
        }}
        draggable={!!slot}
        onDragStart={(e) => slot && handleDragStart(e, slot, { raidId, groupIndex, slotIndex })}
        onDragOver={(e) => handleDragOver(e, slotKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, raidId, groupIndex, slotIndex)}
        onDragEnd={handleDragEnd}
        onClick={() => slot && removePlayerFromSlot(raidId, groupIndex, slotIndex)}
      >
        {slot && (
          <>
            <img
              src={getSpecIconUrl(slot.mainSpec)}
              alt={slot.mainSpec}
              className="w-6 h-6 pointer-events-none"
            />
            <span className="flex-1 text-xs font-medium text-black px-1 truncate pointer-events-none">
              {slot.name}
            </span>
          </>
        )}
      </div>
    );
  };

  // Render raid section (WoWSims style)
  const renderRaidSection = (raid: RaidConfig, compact: boolean = false) => {
    const totalAssigned = getRaidCount(raid.id);
    const maxPlayers = getRaidMax(raid.id);
    const is25Man = raid.size === '25';

    return (
      <div key={raid.id} className={compact ? '' : 'mb-6'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Input
              value={raid.name}
              onChange={(e) => updateRaidName(raid.id, e.target.value)}
              className="w-36 h-7 text-sm bg-transparent border-none text-white font-medium hover:bg-white/10 focus:bg-white/10 px-1"
            />
            <span className="text-xs text-gray-400">{totalAssigned}/{maxPlayers}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10">
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => clearRaid(raid.id)}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10">
              <Camera className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Groups Grid */}
        <div className={`grid gap-3 ${is25Man ? 'grid-cols-5' : 'grid-cols-2'}`}>
          {raid.groups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="text-xs text-gray-500 mb-1">Group {groupIndex + 1}</div>
              <div className="space-y-0.5">
                {group.map((slot, slotIndex) => renderPlayerSlot(slot, raid.id, groupIndex, slotIndex))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render class group in sidebar (WoWSims style)
  const renderClassGroup = (className: string, classPlayers: Player[], inRaid: boolean = false) => {
    const classColor = WOWSIMS_CLASS_COLORS[className] || WOWSIMS_CLASS_COLORS.Unknown;

    return (
      <div key={`${className}-${inRaid ? 'raid' : 'avail'}`} className="mb-2">
        <div
          className="flex flex-wrap gap-1 p-1 rounded"
          style={{ backgroundColor: `${classColor}50` }}
        >
          {classPlayers.map((player) => (
            <div
              key={`sidebar-${player.id}-${inRaid ? 'raid' : 'avail'}`}
              draggable
              onDragStart={(e) => handleDragStart(e, player, 'available')}
              onDragEnd={handleDragEnd}
              onClick={() => !inRaid && addPlayerToRaid('main-25', player)}
              className={`w-8 h-8 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/50 transition-all ${
                inRaid ? 'opacity-60' : ''
              }`}
              title={`${player.name} - ${player.mainSpec?.replace(player.class, '').trim()}`}
            >
              <img
                src={getSpecIconUrl(player.mainSpec)}
                alt={player.mainSpec}
                className="w-full h-full pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Raid Compositions</h1>
            <p className="text-gray-400 text-sm">Build and manage raid groups</p>
          </div>
        </div>
        <div className="bg-[#111] rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
          <p className="text-gray-400 mb-4">Add players to your roster first.</p>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import from Raid-Helper
          </Button>
        </div>
      </div>
    );
  }

  const mainRaid = raids.find(r => r.id === 'main-25');
  const splitRaids = raids.filter(r => r.id.startsWith('split-10'));
  const roleGroupedPlayers = groupPlayersByRole(players);

  return (
    <div
      className="min-h-screen bg-black text-white -m-6 p-4"
      onDragOver={handleDragOver}
      onDrop={handleDropToAvailable}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h1 className="text-xl font-bold">Raid Compositions</h1>
          <p className="text-gray-400 text-sm">Drag players to assign groups</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-gray-600 text-gray-300 hover:bg-white/10"
          onClick={() => setIsImportDialogOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      {/* 25-Man Raid */}
      {mainRaid && renderRaidSection(mainRaid)}

      {/* 10-Man Splits */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">10-Man Splits</h2>
          <span className="text-xs text-gray-500">Players can be in both 25-man and 10-man</span>
        </div>
        <div className="flex gap-2">
          {splitRaids.map(raid => (
            <div key={raid.id} className="flex-1">
              {renderRaidSection(raid, true)}
            </div>
          ))}
        </div>
      </div>

      {/* Available Players - Role Columns */}
      <div className="mt-8">
        <div className="grid grid-cols-4 gap-4">
          {/* Tank Column */}
          <div className="flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Tank} alt="Tank" className="w-8 h-8" />
              </div>
            </div>
            <div
              className="text-center py-2 font-bold text-white"
              style={{ backgroundColor: ROLE_COLORS.Tank }}
            >
              Tank
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Tank.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Tank.map((player, index) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="px-3 py-2 text-center border-b border-[#333] last:border-b-0 text-sm font-medium cursor-grab active:cursor-grabbing hover:bg-white/5"
                    style={{
                      color: WOWSIMS_CLASS_COLORS[player.class],
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {getSpecName(player.mainSpec, player.class)}
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Tank.length}
            </div>
          </div>

          {/* Healer Column */}
          <div className="flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Healer} alt="Healer" className="w-8 h-8" />
              </div>
            </div>
            <div
              className="text-center py-2 font-bold text-white"
              style={{ backgroundColor: ROLE_COLORS.Healer }}
            >
              Healer
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Healer.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Healer.map((player, index) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="px-3 py-2 text-center border-b border-[#333] last:border-b-0 text-sm font-medium cursor-grab active:cursor-grabbing hover:bg-white/5"
                    style={{
                      color: WOWSIMS_CLASS_COLORS[player.class],
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {getSpecName(player.mainSpec, player.class)}
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Healer.length}
            </div>
          </div>

          {/* Melee Column */}
          <div className="flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Melee} alt="Melee" className="w-8 h-8" />
              </div>
            </div>
            <div
              className="text-center py-2 font-bold text-white"
              style={{ backgroundColor: ROLE_COLORS.Melee }}
            >
              Melee
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Melee.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Melee.map((player, index) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="px-3 py-2 text-center border-b border-[#333] last:border-b-0 text-sm font-medium cursor-grab active:cursor-grabbing hover:bg-white/5"
                    style={{
                      color: WOWSIMS_CLASS_COLORS[player.class],
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {getSpecName(player.mainSpec, player.class)}
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Melee.length}
            </div>
          </div>

          {/* Ranged Column */}
          <div className="flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Ranged} alt="Ranged" className="w-8 h-8" />
              </div>
            </div>
            <div
              className="text-center py-2 font-bold text-white"
              style={{ backgroundColor: ROLE_COLORS.Ranged }}
            >
              Ranged
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Ranged.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Ranged.map((player, index) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="px-3 py-2 text-center border-b border-[#333] last:border-b-0 text-sm font-medium cursor-grab active:cursor-grabbing hover:bg-white/5"
                    style={{
                      color: WOWSIMS_CLASS_COLORS[player.class],
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {getSpecName(player.mainSpec, player.class)}
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Ranged.length}
            </div>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import from Raid-Helper
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Import signups from a Raid-Helper event or paste signup text.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={importMode === 'event' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('event')}
                className={importMode === 'event' ? '' : 'bg-transparent border-gray-600'}
              >
                Event ID
              </Button>
              <Button
                variant={importMode === 'paste' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImportMode('paste')}
                className={importMode === 'paste' ? '' : 'bg-transparent border-gray-600'}
              >
                <FileText className="h-4 w-4 mr-1" />
                Paste Text
              </Button>
            </div>

            {importMode === 'event' ? (
              <div className="space-y-2">
                <Label className="text-gray-300">Raid-Helper Event ID or URL</Label>
                <Input
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="e.g., 123456789 or full event URL"
                  className="bg-black border-gray-600 text-white"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-gray-300">Paste Raid-Helper Signups</Label>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the signup list from Discord..."
                  className="min-h-[150px] bg-black border-gray-600 text-white font-mono text-sm"
                />
              </div>
            )}

            {importedSignups.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-300">Preview ({importedSignups.length} signups)</Label>
                <div className="max-h-[150px] overflow-y-auto bg-black border border-gray-700 rounded-md p-2 space-y-1">
                  {importedSignups.slice(0, 10).map((signup, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span
                        className="font-medium"
                        style={{ color: signup.class ? WOWSIMS_CLASS_COLORS[signup.class] : '#fff' }}
                      >
                        {signup.name}
                      </span>
                      {signup.spec && (
                        <span className="text-xs text-gray-500">{signup.spec}</span>
                      )}
                    </div>
                  ))}
                  {importedSignups.length > 10 && (
                    <div className="text-xs text-gray-500">...and {importedSignups.length - 10} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="bg-transparent border-gray-600">
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
