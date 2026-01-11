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
import { Users, Copy, RotateCcw, Download, Plus, Loader2, Upload, FileText, Camera, CopyPlus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getSpecIconUrl, normalizeSpecName } from '@/lib/wowhead';
import { SPEC_ROLES } from '@hooligans/shared';

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
      // Include both DPS_Ranged and DPS_Caster in the Ranged column
      Ranged: playerList.filter(p => p.role === 'DPS' && (p.roleSubtype === 'DPS_Ranged' || p.roleSubtype === 'DPS_Caster')),
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

  // Duplicate 25-man to a 10-man split (first 10 players)
  const duplicateTo10Man = (targetRaidId: string) => {
    const mainRaid = raids.find(r => r.id === 'main-25');
    if (!mainRaid) return;

    // Get first 10 players from 25-man
    const players25 = mainRaid.groups.flat().filter(Boolean).slice(0, 10);

    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id !== targetRaidId) return raid;

        // Create new 10-man groups (2 groups of 5)
        const newGroups: RaidGroups = [
          players25.slice(0, 5).concat(Array(5 - Math.min(5, players25.length)).fill(null)),
          players25.slice(5, 10).concat(Array(5 - Math.max(0, players25.length - 5)).fill(null)),
        ];

        return { ...raid, groups: newGroups };
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
            // Filter out Tentative signups
            const confirmedSignups = (event.signUps as Record<string, unknown>[]).filter((s) => {
              const className = s.className as string || '';
              const roleName = s.roleName as string || '';
              const status = s.status as string || '';
              // Exclude tentative/bench signups
              return className !== 'Tentative' &&
                     roleName !== 'Tentative' &&
                     status === 'primary';
            });

            const signups: RaidHelperSignup[] = confirmedSignups.map((s: Record<string, unknown>) => {
              // Capitalize class name (raid-helper returns lowercase like "druid", "hunter")
              let rawClass = s.className as string | undefined;

              // Raid-Helper sometimes returns "Tank" or "Tentative" as className - derive real class from spec
              if (rawClass === 'Tank' || rawClass === 'Tentative' || !rawClass) {
                // Try to derive class from specName
                const specName = (s.specName as string || '').replace(/\d+$/, ''); // Remove trailing numbers
                const specToClass: Record<string, string> = {
                  'Protection': 'Warrior', // Could be Paladin, but Warrior is common
                  'Guardian': 'Druid',
                  'Feral': 'Druid',
                  'Bear': 'Druid',
                  'Holy': 'Paladin', // Could be Priest
                  'Retribution': 'Paladin',
                  'Restoration': 'Shaman', // Could be Druid
                  'Balance': 'Druid',
                  'Shadow': 'Priest',
                  'Discipline': 'Priest',
                  'Elemental': 'Shaman',
                  'Enhancement': 'Shaman',
                  'Destruction': 'Warlock',
                  'Affliction': 'Warlock',
                  'Demonology': 'Warlock',
                  'Fury': 'Warrior',
                  'Arms': 'Warrior',
                  'Combat': 'Rogue',
                  'Assassination': 'Rogue',
                  'Subtlety': 'Rogue',
                  'Arcane': 'Mage',
                  'Fire': 'Mage',
                  'Frost': 'Mage',
                  'BeastMastery': 'Hunter',
                  'Marksmanship': 'Hunter',
                  'Survival': 'Hunter',
                };
                rawClass = specToClass[specName] || rawClass;
              }

              const className = rawClass
                ? rawClass.charAt(0).toUpperCase() + rawClass.slice(1).toLowerCase()
                : undefined;

              // Clean spec name - remove trailing numbers (e.g., "Protection1" -> "Protection")
              const specName = ((s.specName as string) || '').replace(/\d+$/, '');

              return {
                name: (s.name || s.specName || 'Unknown') as string,
                discordId: (s.odUserId || s.userId) as string | undefined,
                class: className,
                spec: specName,
                role: (s.roleName || s.role) as string | undefined,
              };
            });
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
    const tempPlayers: Player[] = importedSignups.map((signup, index) => {
      // Debug: Log what we're getting from Raid-Helper
      console.log('Importing:', { name: signup.name, class: signup.class, spec: signup.spec, role: signup.role });

      // Normalize spec name to our format (e.g., "Resto" -> "DruidRestoration")
      let mainSpec = normalizeSpecName(signup.spec || '', signup.class);

      // Get role info from SPEC_ROLES mapping
      let specRole = SPEC_ROLES[mainSpec];

      // Determine role based on Raid-Helper role or spec mapping
      let role = 'DPS';
      let roleSubtype = 'DPS_Melee';

      if (specRole) {
        role = specRole.role;
        roleSubtype = specRole.subtype;
      } else if (signup.role) {
        // Map Raid-Helper roles
        const rhRole = signup.role.toLowerCase();
        if (rhRole.includes('tank')) {
          role = 'Tank';
          roleSubtype = 'Tank';
        } else if (rhRole.includes('heal') || rhRole.includes('healer')) {
          role = 'Heal';
          roleSubtype = 'Heal';
        } else if (rhRole.includes('melee')) {
          role = 'DPS';
          roleSubtype = 'DPS_Melee';
        } else if (rhRole.includes('range') || rhRole.includes('caster')) {
          role = 'DPS';
          roleSubtype = 'DPS_Ranged';
        }

        // If spec didn't resolve but we have role, try to create a spec from role + class
        if ((mainSpec === 'Unknown' || mainSpec === '') && signup.class) {
          // Fallback specs based on role when spec is missing
          const fallbackSpecs: Record<string, Record<string, string>> = {
            Warrior: { Tank: 'WarriorProtection', Heal: 'WarriorProtection', DPS: 'WarriorFury', DPS_Melee: 'WarriorFury', DPS_Ranged: 'WarriorFury' },
            Paladin: { Tank: 'PaladinProtection', Heal: 'PaladinHoly', DPS: 'PaladinRetribution', DPS_Melee: 'PaladinRetribution', DPS_Ranged: 'PaladinRetribution' },
            Hunter: { Tank: 'HunterBeastMastery', Heal: 'HunterBeastMastery', DPS: 'HunterBeastMastery', DPS_Melee: 'HunterSurvival', DPS_Ranged: 'HunterBeastMastery' },
            Rogue: { Tank: 'RogueCombat', Heal: 'RogueCombat', DPS: 'RogueCombat', DPS_Melee: 'RogueCombat', DPS_Ranged: 'RogueCombat' },
            Priest: { Tank: 'PriestShadow', Heal: 'PriestHoly', DPS: 'PriestShadow', DPS_Melee: 'PriestShadow', DPS_Ranged: 'PriestShadow' },
            Shaman: { Tank: 'ShamanEnhancement', Heal: 'ShamanRestoration', DPS: 'ShamanElemental', DPS_Melee: 'ShamanEnhancement', DPS_Ranged: 'ShamanElemental' },
            Mage: { Tank: 'MageFire', Heal: 'MageFire', DPS: 'MageFire', DPS_Melee: 'MageFire', DPS_Ranged: 'MageFire' },
            Warlock: { Tank: 'WarlockDestruction', Heal: 'WarlockDestruction', DPS: 'WarlockDestruction', DPS_Melee: 'WarlockDestruction', DPS_Ranged: 'WarlockDestruction' },
            Druid: { Tank: 'DruidGuardian', Heal: 'DruidRestoration', DPS: 'DruidBalance', DPS_Melee: 'DruidFeral', DPS_Ranged: 'DruidBalance' },
          };
          const classFallbacks = fallbackSpecs[signup.class];
          if (classFallbacks) {
            // Try to match the most specific role first
            mainSpec = classFallbacks[roleSubtype] || classFallbacks[role] || classFallbacks.DPS;
            specRole = SPEC_ROLES[mainSpec];
            if (specRole) {
              role = specRole.role;
              roleSubtype = specRole.subtype;
            }
          }
        }
      }

      // Final fallback: if we still don't have a valid spec but have a class, use a default
      if ((mainSpec === 'Unknown' || mainSpec === '') && signup.class) {
        const defaultSpecs: Record<string, string> = {
          Warrior: 'WarriorFury',
          Paladin: 'PaladinRetribution',
          Hunter: 'HunterBeastMastery',
          Rogue: 'RogueCombat',
          Priest: 'PriestShadow',
          Shaman: 'ShamanElemental',
          Mage: 'MageFire',
          Warlock: 'WarlockDestruction',
          Druid: 'DruidBalance',
        };
        mainSpec = defaultSpecs[signup.class] || mainSpec;
        const specRole = SPEC_ROLES[mainSpec];
        if (specRole) {
          role = specRole.role;
          roleSubtype = specRole.subtype;
        }
      }

      // Debug: Log what we resolved to
      console.log('Resolved:', { mainSpec, role, roleSubtype });

      return {
        id: `imported-${index}-${Date.now()}`,
        name: signup.name,
        class: signup.class || 'Unknown',
        mainSpec,
        role,
        roleSubtype,
        discordId: signup.discordId,
      };
    });

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
        className={`h-8 flex items-center transition-all cursor-pointer border border-[#444] ${
          slot ? '' : 'bg-[#1a1a1a]'
        } ${isDragOver ? 'ring-2 ring-yellow-400/50' : ''}`}
        style={{
          backgroundColor: slot ? classColor || '#333' : undefined,
        }}
        draggable={!!slot}
        onDragStart={(e) => slot && handleDragStart(e, slot, { raidId, groupIndex, slotIndex })}
        onDragOver={(e) => handleDragOver(e, slotKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, raidId, groupIndex, slotIndex)}
        onDragEnd={handleDragEnd}
        onDoubleClick={() => slot && removePlayerFromSlot(raidId, groupIndex, slotIndex)}
      >
        {slot && (
          <>
            <img
              src={getSpecIconUrl(slot.mainSpec, slot.class)}
              alt={slot.mainSpec}
              className="w-7 h-7 ml-0.5"
            />
            <span className="flex-1 text-sm font-bold text-black pl-2 truncate">
              {slot.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removePlayerFromSlot(raidId, groupIndex, slotIndex);
              }}
              className="px-2 text-red-700 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
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
    const is10Man = raid.size === '10';

    return (
      <div key={raid.id} className={compact ? '' : 'mb-6'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Input
              value={raid.name}
              onChange={(e) => updateRaidName(raid.id, e.target.value)}
              className="w-32 h-6 text-sm bg-transparent border-none text-white font-medium hover:bg-white/10 focus:bg-white/10 px-1"
            />
            <span className="text-xs text-gray-400">{totalAssigned}/{maxPlayers}</span>
          </div>
        </div>

        {/* Group Headers Row */}
        <div className={`flex ${is25Man ? 'gap-0' : 'gap-0'}`}>
          {raid.groups.map((_, groupIndex) => (
            <div key={groupIndex} className="w-[150px]">
              <div className="text-yellow-500 text-xs font-medium pb-1 border-b-2 border-yellow-500 text-center">
                Group {groupIndex + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Groups Grid */}
        <div className={`flex ${is25Man ? 'gap-0' : 'gap-0'} mt-1`}>
          {raid.groups.map((group, groupIndex) => (
            <div key={groupIndex} className="w-[150px] bg-[#111] border-2 border-[#444] rounded">
              <div className="space-y-px p-0.5">
                {group.map((slot, slotIndex) => renderPlayerSlot(slot, raid.id, groupIndex, slotIndex))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 mt-2">
          {is10Man && (
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 border-green-600 text-green-500 hover:text-green-400 hover:bg-green-900/20"
              onClick={() => duplicateTo10Man(raid.id)}
              title="Copy from 25-man"
            >
              <CopyPlus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-6 w-6 border-green-600 text-green-500 hover:text-green-400 hover:bg-green-900/20">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6 border-green-600 text-green-500 hover:text-green-400 hover:bg-green-900/20" onClick={() => clearRaid(raid.id)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6 border-green-600 text-green-500 hover:text-green-400 hover:bg-green-900/20">
            <Camera className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-6 w-6 border-green-600 text-green-500 hover:text-green-400 hover:bg-green-900/20">
            <Download className="h-3.5 w-3.5" />
          </Button>
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
                src={getSpecIconUrl(player.mainSpec, player.class)}
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
  // Only show unassigned players in role columns
  const roleGroupedPlayers = groupPlayersByRole(unassignedPlayers);

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
      </div>

      {/* 25-Man Raid + Role Columns side by side */}
      <div className="flex items-start">
        {/* 25-Man Raid */}
        <div className="flex-shrink-0">
          {mainRaid && renderRaidSection(mainRaid)}
        </div>

        {/* Role Columns Section */}
        <div className="ml-auto mr-16">
          {/* Import button above Tank */}
          <div className="mb-2">
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
          {/* Role Columns - all 4 side by side */}
          <div className="flex gap-2">
          {/* Tank Column */}
          <div className="flex flex-col w-[120px]">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Tank} alt="Tank" className="w-8 h-8" />
              </div>
            </div>
            <div className="border-t-4 border-[#5a3a1a]" style={{ backgroundColor: ROLE_COLORS.Tank }}>
              <div className="text-center py-1.5 font-bold text-white text-sm">
                Tank
              </div>
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Tank.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Tank.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="flex items-center h-7 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all border-b border-black/20"
                    style={{ backgroundColor: WOWSIMS_CLASS_COLORS[player.class] }}
                  >
                    <img
                      src={getSpecIconUrl(player.mainSpec, player.class)}
                      alt={player.mainSpec}
                      className="w-6 h-6 pointer-events-none"
                    />
                    <span className="flex-1 text-[11px] font-medium text-black px-1 truncate pointer-events-none">
                      {player.name}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Tank.length}
            </div>
          </div>

          {/* Healer Column */}
          <div className="flex flex-col w-[120px]">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Healer} alt="Healer" className="w-8 h-8" />
              </div>
            </div>
            <div className="border-t-4 border-[#1a5a3a]" style={{ backgroundColor: ROLE_COLORS.Healer }}>
              <div className="text-center py-1.5 font-bold text-white text-sm">
                Healer
              </div>
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Healer.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Healer.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="flex items-center h-7 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all border-b border-black/20"
                    style={{ backgroundColor: WOWSIMS_CLASS_COLORS[player.class] }}
                  >
                    <img
                      src={getSpecIconUrl(player.mainSpec, player.class)}
                      alt={player.mainSpec}
                      className="w-6 h-6 pointer-events-none"
                    />
                    <span className="flex-1 text-[11px] font-medium text-black px-1 truncate pointer-events-none">
                      {player.name}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Healer.length}
            </div>
          </div>

          {/* Melee Column */}
          <div className="flex flex-col w-[120px]">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Melee} alt="Melee" className="w-8 h-8" />
              </div>
            </div>
            <div className="border-t-4 border-[#5a0000]" style={{ backgroundColor: ROLE_COLORS.Melee }}>
              <div className="text-center py-1.5 font-bold text-white text-sm">
                Melee
              </div>
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Melee.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Melee.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="flex items-center h-7 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all border-b border-black/20"
                    style={{ backgroundColor: WOWSIMS_CLASS_COLORS[player.class] }}
                  >
                    <img
                      src={getSpecIconUrl(player.mainSpec, player.class)}
                      alt={player.mainSpec}
                      className="w-6 h-6 pointer-events-none"
                    />
                    <span className="flex-1 text-[11px] font-medium text-black px-1 truncate pointer-events-none">
                      {player.name}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="text-center py-2 bg-[#1a1a1a] border-x border-b border-[#333] text-sm font-semibold">
              {roleGroupedPlayers.Melee.length}
            </div>
          </div>

          {/* Ranged Column */}
          <div className="flex flex-col w-[120px]">
            <div className="flex justify-center py-3">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                <img src={ROLE_ICONS.Ranged} alt="Ranged" className="w-8 h-8" />
              </div>
            </div>
            <div className="border-t-4 border-[#2a0050]" style={{ backgroundColor: ROLE_COLORS.Ranged }}>
              <div className="text-center py-1.5 font-bold text-white text-sm">
                Ranged
              </div>
            </div>
            <div className="border-x border-b border-[#333] flex-1 min-h-[100px]">
              {roleGroupedPlayers.Ranged.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No players</div>
              ) : (
                roleGroupedPlayers.Ranged.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPlayerToRaid('main-25', player)}
                    className="flex items-center h-7 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all border-b border-black/20"
                    style={{ backgroundColor: WOWSIMS_CLASS_COLORS[player.class] }}
                  >
                    <img
                      src={getSpecIconUrl(player.mainSpec, player.class)}
                      alt={player.mainSpec}
                      className="w-6 h-6 pointer-events-none"
                    />
                    <span className="flex-1 text-[11px] font-medium text-black px-1 truncate pointer-events-none">
                      {player.name}
                    </span>
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
      </div>

      {/* 10-Man Splits Section */}
      <div className="mt-6">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-sm font-semibold text-gray-300">10-Man Splits</h2>
          <span className="text-xs text-gray-500">Players can be in both 25-man and 10-man</span>
        </div>
        <div className="flex gap-3">
          {splitRaids.map(raid => (
            <div key={raid.id}>
              {renderRaidSection(raid, true)}
            </div>
          ))}
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
