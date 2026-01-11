'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import html2canvas from 'html2canvas';
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
import { Users, Copy, RotateCcw, Download, Plus, Loader2, Upload, FileText, Camera, X, Share2, Send, Hash, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSpecIconUrl } from '@/lib/wowhead';
import { CLASS_SPECS, SPEC_ROLES } from '@hooligans/shared';
import { useTeam } from '@/components/providers/team-provider';

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
const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

// Role colors for the category headers
const ROLE_COLORS: Record<string, string> = {
  Tank: '#8B0000',
  Healer: '#8B0000',
  Melee: '#8B0000',
  Ranged: '#8B0000',
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
  notes?: string;
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

export default function RosterPage() {
  const { selectedTeam, teams } = useTeam();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragSource, setDragSource] = useState<{ raidId: string; groupIndex: number; slotIndex: number } | 'available' | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Discord ID import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Discord Role import state
  const [isRoleImportDialogOpen, setIsRoleImportDialogOpen] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleMembers, setRoleMembers] = useState<{ id: string; displayName: string; avatar: string | null }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isImportingRole, setIsImportingRole] = useState(false);
  const [memberConfigs, setMemberConfigs] = useState<Record<string, { wowClass: string; mainSpec: string }>>({});

  // Edit player dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState({ name: '', wowClass: '', mainSpec: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Add player dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', wowClass: '', mainSpec: '', notes: '', discordId: '', teamId: '' });

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportRaidId, setExportRaidId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'plain' | 'csv' | 'names' | 'mrt' | 'json'>('plain');

  // Refs for screenshot functionality
  const raidRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tenManSectionRef = useRef<HTMLDivElement | null>(null);

  // Screenshot dialog state
  const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
  const [screenshotRaidId, setScreenshotRaidId] = useState<string | null>(null);
  const [isDiscordDialogOpen, setIsDiscordDialogOpen] = useState(false);
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [messageTitle, setMessageTitle] = useState('');
  const [tagPlayers, setTagPlayers] = useState(true);
  const [isSendingToDiscord, setIsSendingToDiscord] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [isPostAllDialogOpen, setIsPostAllDialogOpen] = useState(false);
  const [postAllChannel, setPostAllChannel] = useState('');
  const [postAllTitle, setPostAllTitle] = useState('');
  const [isSendingPostAll, setIsSendingPostAll] = useState(false);

  // Cleanup dialog state
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [cleanupChannel, setCleanupChannel] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

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
    if (selectedTeam) {
      fetchPlayersAndAssignments();
    }
  }, [selectedTeam]);

  // Fetch players only
  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  // Fetch Discord roles
  const fetchDiscordRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch('/api/discord/roles');
      if (res.ok) {
        const data = await res.json();
        setDiscordRoles(data);
      }
    } catch (error) {
      console.error('Failed to fetch Discord roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Fetch members by role
  const fetchMembersByRole = async (roleId: string) => {
    if (!roleId) {
      setRoleMembers([]);
      setMemberConfigs({});
      return;
    }
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/discord/members?roleId=${roleId}`);
      if (res.ok) {
        const data = await res.json();
        setRoleMembers(data.members);
        // Initialize empty configs for each member
        const configs: Record<string, { wowClass: string; mainSpec: string }> = {};
        data.members.forEach((member: { id: string }) => {
          configs[member.id] = { wowClass: '', mainSpec: '' };
        });
        setMemberConfigs(configs);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Open role import dialog
  const openRoleImportDialog = async () => {
    setIsRoleImportDialogOpen(true);
    setSelectedRoleId('');
    setRoleMembers([]);
    setMemberConfigs({});
    await fetchDiscordRoles();
  };

  // Handle role selection
  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    fetchMembersByRole(roleId);
  };

  // Import players from Discord role
  const handleImportFromRole = async () => {
    if (roleMembers.length === 0 || !selectedTeam) return;

    setIsImportingRole(true);
    try {
      // Build member configs with class/spec data and display name
      const membersWithConfig = roleMembers.map(m => ({
        discordId: m.id,
        displayName: m.displayName,
        wowClass: memberConfigs[m.id]?.wowClass || null,
        mainSpec: memberConfigs[m.id]?.mainSpec || null,
      }));

      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk', members: membersWithConfig, teamId: selectedTeam.id }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchPlayersAndAssignments();
        setIsRoleImportDialogOpen(false);
      } else {
        const error = await res.json();
        alert(`Failed to import: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import players');
    } finally {
      setIsImportingRole(false);
    }
  };

  const fetchPlayersAndAssignments = async () => {
    if (!selectedTeam) return;

    try {
      // Fetch players and assignments in parallel
      const [playersRes, assignmentsRes] = await Promise.all([
        fetch(`/api/players?teamId=${selectedTeam.id}`),
        fetch(`/api/roster-assignments?teamId=${selectedTeam.id}`),
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);

        // Apply saved assignments if available
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          if (Array.isArray(assignmentsData) && assignmentsData.length > 0) {
            setRaids(prevRaids => {
              const newRaids = prevRaids.map(raid => ({
                ...raid,
                groups: raid.groups.map(group => [...group]),
              }));

              // Apply each assignment
              for (const assignment of assignmentsData) {
                const raid = newRaids.find(r => r.id === assignment.raidId);
                if (raid && assignment.player) {
                  const player = playersData.find((p: Player) => p.id === assignment.playerId);
                  if (player && raid.groups[assignment.groupIndex]) {
                    raid.groups[assignment.groupIndex][assignment.slotIndex] = player;
                  }
                }
              }

              return newRaids;
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save assignment to database
  const saveAssignment = async (raidId: string, groupIndex: number, slotIndex: number, playerId: string) => {
    if (!selectedTeam) return;

    try {
      await fetch('/api/roster-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidId, groupIndex, slotIndex, playerId, teamId: selectedTeam.id }),
      });
    } catch (error) {
      console.error('Failed to save assignment:', error);
    }
  };

  // Delete assignment from database
  const deleteAssignment = async (raidId: string, groupIndex: number, slotIndex: number) => {
    if (!selectedTeam) return;

    try {
      await fetch(`/api/roster-assignments?teamId=${selectedTeam.id}&raidId=${raidId}&groupIndex=${groupIndex}&slotIndex=${slotIndex}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  };

  // Clear all assignments for a raid
  const clearRaidAssignments = async (raidId: string) => {
    if (!selectedTeam) return;

    try {
      await fetch(`/api/roster-assignments?teamId=${selectedTeam.id}&raidId=${raidId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to clear raid assignments:', error);
    }
  };

  // Check if player is pending (no name set - show "???" instead)
  const isPendingPlayer = (player: Player) => {
    return player.name.startsWith('Pending-');
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

  // Group players by role for the role columns view, sorted by class
  const groupPlayersByRole = (playerList: Player[]) => {
    const sortByClass = (players: Player[]) => {
      return [...players].sort((a, b) => {
        const classCompare = CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
        if (classCompare !== 0) return classCompare;
        return a.mainSpec.localeCompare(b.mainSpec);
      });
    };

    return {
      Tank: sortByClass(playerList.filter(p => p.role === 'Tank')),
      Healer: sortByClass(playerList.filter(p => p.role === 'Heal')),
      Melee: sortByClass(playerList.filter(p => p.role === 'DPS' && p.roleSubtype === 'DPS_Melee')),
      Ranged: sortByClass(playerList.filter(p => p.role === 'DPS' && (p.roleSubtype === 'DPS_Ranged' || p.roleSubtype === 'DPS_Caster'))),
    };
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

    // Track what assignments need to be saved/deleted
    const assignmentsToSave: { raidId: string; groupIndex: number; slotIndex: number; playerId: string }[] = [];
    const assignmentsToDelete: { raidId: string; groupIndex: number; slotIndex: number }[] = [];

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

            // Save both positions
            assignmentsToSave.push({ raidId, groupIndex, slotIndex, playerId: draggedPlayer.id });
            if (targetPlayer) {
              assignmentsToSave.push({ raidId: dragSource.raidId, groupIndex: dragSource.groupIndex, slotIndex: dragSource.slotIndex, playerId: targetPlayer.id });
            } else {
              assignmentsToDelete.push({ raidId: dragSource.raidId, groupIndex: dragSource.groupIndex, slotIndex: dragSource.slotIndex });
            }
          } else {
            // Move between raids
            sourceRaid.groups[dragSource.groupIndex][dragSource.slotIndex] = null;
            const targetPlayer = targetRaid.groups[groupIndex][slotIndex];
            targetRaid.groups[groupIndex][slotIndex] = draggedPlayer;

            // Save target position
            assignmentsToSave.push({ raidId, groupIndex, slotIndex, playerId: draggedPlayer.id });

            if (targetPlayer) {
              sourceRaid.groups[dragSource.groupIndex][dragSource.slotIndex] = targetPlayer;
              assignmentsToSave.push({ raidId: dragSource.raidId, groupIndex: dragSource.groupIndex, slotIndex: dragSource.slotIndex, playerId: targetPlayer.id });
            } else {
              assignmentsToDelete.push({ raidId: dragSource.raidId, groupIndex: dragSource.groupIndex, slotIndex: dragSource.slotIndex });
            }
          }
        }
      } else if (dragSource === 'available') {
        if (raidId.startsWith('split-10') || !alreadyInRaid) {
          if (raidId.startsWith('split-10') && alreadyInRaid) {
            return prevRaids;
          }
          targetRaid.groups[groupIndex][slotIndex] = draggedPlayer;
          assignmentsToSave.push({ raidId, groupIndex, slotIndex, playerId: draggedPlayer.id });
        }
      }

      return newRaids;
    });

    // Save assignments to database
    assignmentsToSave.forEach(a => saveAssignment(a.raidId, a.groupIndex, a.slotIndex, a.playerId));
    assignmentsToDelete.forEach(a => deleteAssignment(a.raidId, a.groupIndex, a.slotIndex));

    setDraggedPlayer(null);
    setDragSource(null);
  };

  const handleDropToAvailable = (e: DragEvent) => {
    e.preventDefault();
    if (!draggedPlayer || dragSource === 'available' || !dragSource) return;

    // Delete assignment from database
    deleteAssignment(dragSource.raidId, dragSource.groupIndex, dragSource.slotIndex);

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
    // Find first empty slot for player
    const targetRaid = raids.find(r => r.id === raidId);
    if (!targetRaid) return;

    const alreadyInRaid = targetRaid.groups.flat().some(p => p?.id === player.id);
    if (alreadyInRaid) return;

    // Find first empty slot
    let foundPosition: { groupIndex: number; slotIndex: number } | null = null;
    for (let gi = 0; gi < targetRaid.groups.length && !foundPosition; gi++) {
      for (let si = 0; si < targetRaid.groups[gi].length && !foundPosition; si++) {
        if (targetRaid.groups[gi][si] === null) {
          foundPosition = { groupIndex: gi, slotIndex: si };
        }
      }
    }

    if (!foundPosition) return;

    const { groupIndex, slotIndex } = foundPosition;

    setRaids(prevRaids => {
      return prevRaids.map(raid => {
        if (raid.id !== raidId) return raid;
        const newGroups = raid.groups.map(group => [...group]);
        newGroups[groupIndex][slotIndex] = player;
        return { ...raid, groups: newGroups };
      });
    });

    // Save to database
    saveAssignment(raidId, groupIndex, slotIndex, player.id);
  };

  // Remove player from slot
  const removePlayerFromSlot = (raidId: string, groupIndex: number, slotIndex: number) => {
    // Delete from database
    deleteAssignment(raidId, groupIndex, slotIndex);

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
    // Clear all assignments for this raid from database
    clearRaidAssignments(raidId);

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

  // Import Discord IDs
  const handleImportDiscordIds = async () => {
    const lines = importText.split('\n').map(line => line.trim()).filter(line => line && /^\d{17,19}$/.test(line));

    if (lines.length === 0) {
      alert('No valid Discord IDs found. Discord IDs should be 17-19 digit numbers.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk', discordIds: lines }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchPlayers();
        setIsImportDialogOpen(false);
        setImportText('');
      } else {
        alert('Failed to import players');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import players');
    } finally {
      setIsImporting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (player: Player) => {
    setEditingPlayer(player);
    setEditForm({
      name: player.name.startsWith('Pending-') ? '' : player.name,
      wowClass: player.class,
      mainSpec: player.mainSpec,
      notes: player.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // Save edited player
  const handleSavePlayer = async () => {
    if (!editingPlayer || !editForm.name || !editForm.mainSpec) return;

    setIsSaving(true);
    try {
      const specRole = SPEC_ROLES[editForm.mainSpec];
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          wowClass: editForm.wowClass,
          mainSpec: editForm.mainSpec,
          role: specRole?.role || 'DPS',
          roleSubtype: specRole?.subtype || 'DPS_Melee',
          notes: editForm.notes || null,
        }),
      });

      if (res.ok) {
        await fetchPlayers();
        setIsEditDialogOpen(false);
        setEditingPlayer(null);
      }
    } catch (error) {
      console.error('Failed to save player:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete player
  const handleDeletePlayer = async (player: Player) => {
    if (!confirm(`Delete ${player.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/players/${player.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Remove from raids
        setRaids(prevRaids => prevRaids.map(raid => ({
          ...raid,
          groups: raid.groups.map(group => group.map(slot => slot?.id === player.id ? null : slot)),
        })));
        await fetchPlayers();
      }
    } catch (error) {
      console.error('Failed to delete player:', error);
    }
  };

  // Add new player
  const handleAddPlayer = async () => {
    if (!newPlayer.name || !newPlayer.mainSpec || !newPlayer.teamId) return;

    setIsSaving(true);
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
          teamId: newPlayer.teamId,
        }),
      });

      if (res.ok) {
        await fetchPlayersAndAssignments();
        setNewPlayer({ name: '', wowClass: '', mainSpec: '', notes: '', discordId: '', teamId: '' });
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to add player:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Screenshot functions
  const openScreenshotDialog = (raidId: string) => {
    setScreenshotRaidId(raidId);
    setIsScreenshotDialogOpen(true);
  };

  const downloadScreenshot = async () => {
    if (!screenshotRaidId) return;

    if (screenshotRaidId === 'all-10-man') {
      const element = tenManSectionRef.current;
      if (!element) return;

      try {
        const hideElements = element.querySelectorAll('.screenshot-hide');
        hideElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

        const canvas = await html2canvas(element, {
          backgroundColor: '#0d1117',
          scale: 4,
          useCORS: true,
          logging: false,
        });

        hideElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

        const link = document.createElement('a');
        link.download = '10-Man_Splits.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsScreenshotDialogOpen(false);
      } catch (error) {
        console.error('Screenshot failed:', error);
      }
      return;
    }

    const raid = raids.find(r => r.id === screenshotRaidId);
    const element = raidRefs.current[screenshotRaidId];
    if (!raid || !element) return;

    try {
      const hideElements = element.querySelectorAll('.screenshot-hide');
      hideElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

      const canvas = await html2canvas(element, {
        backgroundColor: '#0d1117',
        scale: 4,
        useCORS: true,
        logging: false,
      });

      hideElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

      const link = document.createElement('a');
      link.download = `${raid.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsScreenshotDialogOpen(false);
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  // Fetch Discord channels
  const fetchDiscordChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/discord/channels');
      if (res.ok) {
        const data = await res.json();
        setDiscordChannels(data);
      }
    } catch (error) {
      console.error('Failed to fetch Discord channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const openDiscordDialog = async () => {
    setIsScreenshotDialogOpen(false);
    setIsDiscordDialogOpen(true);
    setMessageTitle('');
    setSelectedChannel('');
    await fetchDiscordChannels();
  };

  const sendToDiscord = async () => {
    if (!screenshotRaidId || !selectedChannel) return;

    const is10ManCombined = screenshotRaidId === 'all-10-man';
    const element = is10ManCombined ? tenManSectionRef.current : raidRefs.current[screenshotRaidId];
    const raid = is10ManCombined ? null : raids.find(r => r.id === screenshotRaidId);

    if (!element) return;

    setIsSendingToDiscord(true);
    try {
      const hideElements = element.querySelectorAll('.screenshot-hide');
      hideElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

      const canvas = await html2canvas(element, {
        backgroundColor: '#0d1117',
        scale: 4,
        useCORS: true,
        logging: false,
      });

      hideElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

      const imageData = canvas.toDataURL('image/png');
      const playerDiscordIds: string[] = [];

      if (tagPlayers) {
        if (is10ManCombined) {
          splitRaids.forEach(splitRaid => {
            splitRaid.groups.flat().forEach(player => {
              if (player?.discordId && !playerDiscordIds.includes(player.discordId)) {
                playerDiscordIds.push(player.discordId);
              }
            });
          });
        } else if (raid) {
          raid.groups.flat().forEach(player => {
            if (player?.discordId) {
              playerDiscordIds.push(player.discordId);
            }
          });
        }
      }

      const title = is10ManCombined ? '10-Man Splits' : (raid?.name || 'Raid');

      const res = await fetch('/api/discord/send-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel,
          imageData,
          title: messageTitle || title,
          playerDiscordIds: tagPlayers ? playerDiscordIds : [],
        }),
      });

      if (res.ok) {
        alert('Screenshot sent to Discord!');
        setIsDiscordDialogOpen(false);
      } else {
        const error = await res.json();
        alert(`Failed to send: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send to Discord:', error);
    } finally {
      setIsSendingToDiscord(false);
    }
  };

  const openPostAllDialog = async () => {
    setIsPostAllDialogOpen(true);
    setPostAllTitle('Raid Compositions');
    setPostAllChannel('');
    await fetchDiscordChannels();
  };

  const generatePostAllContent = (): { content: string; playerDiscordIds: string[] } => {
    const lines: string[] = [];
    const playerDiscordIds: string[] = [];

    if (mainRaid) {
      const hasPlayers = mainRaid.groups.flat().some(Boolean);
      if (hasPlayers) {
        lines.push(`**${mainRaid.name}**`);
        mainRaid.groups.forEach((group, index) => {
          const groupPlayers = group.filter(Boolean);
          if (groupPlayers.length > 0) {
            const playerMentions = groupPlayers.map(p => {
              if (p?.discordId && !playerDiscordIds.includes(p.discordId)) {
                playerDiscordIds.push(p.discordId);
              }
              return p?.discordId ? `<@${p.discordId}>` : p?.name || '';
            }).join(' ');
            lines.push(`Group ${index + 1}: ${playerMentions}`);
          }
        });
        lines.push('');
      }
    }

    splitRaids.forEach((raid) => {
      const hasPlayers = raid.groups.flat().some(Boolean);
      if (hasPlayers) {
        lines.push(`**${raid.name}**`);
        raid.groups.forEach((group, index) => {
          const groupPlayers = group.filter(Boolean);
          if (groupPlayers.length > 0) {
            const playerMentions = groupPlayers.map(p => {
              if (p?.discordId && !playerDiscordIds.includes(p.discordId)) {
                playerDiscordIds.push(p.discordId);
              }
              return p?.discordId ? `<@${p.discordId}>` : p?.name || '';
            }).join(' ');
            lines.push(`Group ${index + 1}: ${playerMentions}`);
          }
        });
        lines.push('');
      }
    });

    return { content: lines.join('\n'), playerDiscordIds };
  };

  const sendPostAllToDiscord = async () => {
    if (!postAllChannel) return;

    setIsSendingPostAll(true);
    try {
      const raidEmbeds: {
        name: string;
        color: number;
        groups: { name: string; players: string[] }[];
        imageData: string;
      }[] = [];

      if (mainRaid) {
        const element = raidRefs.current[mainRaid.id];
        if (element) {
          const hideElements = element.querySelectorAll('.screenshot-hide');
          hideElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

          const canvas = await html2canvas(element, {
            backgroundColor: '#0d1117',
            scale: 4,
            useCORS: true,
            logging: false,
          });

          hideElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

          const groups = mainRaid.groups.map((group, index) => ({
            name: `Group ${index + 1}`,
            players: group.filter(Boolean).map(p =>
              p?.discordId ? `<@${p.discordId}>` : p?.name || ''
            ),
          }));

          raidEmbeds.push({
            name: mainRaid.name,
            color: 0x8B0000,
            groups,
            imageData: canvas.toDataURL('image/png'),
          });
        }
      }

      for (const raid of splitRaids) {
        const hasPlayers = raid.groups.flat().some(Boolean);
        if (!hasPlayers) continue;

        const element = raidRefs.current[raid.id];
        if (element) {
          const hideElements = element.querySelectorAll('.screenshot-hide');
          hideElements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');

          const canvas = await html2canvas(element, {
            backgroundColor: '#0d1117',
            scale: 4,
            useCORS: true,
            logging: false,
          });

          hideElements.forEach(el => (el as HTMLElement).style.visibility = 'visible');

          const groups = raid.groups.map((group, index) => ({
            name: `Group ${index + 1}`,
            players: group.filter(Boolean).map(p =>
              p?.discordId ? `<@${p.discordId}>` : p?.name || ''
            ),
          }));

          raidEmbeds.push({
            name: raid.name,
            color: 0x5865F2,
            groups,
            imageData: canvas.toDataURL('image/png'),
          });
        }
      }

      if (raidEmbeds.length === 0) {
        alert('No raids to post');
        return;
      }

      const res = await fetch('/api/discord/send-raid-embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: postAllChannel,
          title: postAllTitle || 'Raid Compositions',
          raids: raidEmbeds,
        }),
      });

      if (res.ok) {
        alert('Raid compositions posted to Discord!');
        setIsPostAllDialogOpen(false);
      } else {
        const error = await res.json();
        alert(`Failed to send: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send to Discord:', error);
    } finally {
      setIsSendingPostAll(false);
    }
  };

  // Cleanup functions
  const openCleanupDialog = async () => {
    setIsCleanupDialogOpen(true);
    setCleanupChannel('');
    await fetchDiscordChannels();
  };

  const handleCleanup = async () => {
    if (!cleanupChannel) return;

    setIsCleaningUp(true);
    try {
      const res = await fetch('/api/discord/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: cleanupChannel,
          limit: 100,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setIsCleanupDialogOpen(false);
      } else {
        const error = await res.json();
        alert(`Failed to cleanup: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to cleanup:', error);
      alert('Failed to cleanup messages');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Export functions
  const openExportDialog = (raidId: string) => {
    setExportRaidId(raidId);
    setIsExportDialogOpen(true);
  };

  const getExportContent = (): string => {
    if (!exportRaidId) return '';
    const raid = raids.find(r => r.id === exportRaidId);
    if (!raid) return '';

    switch (exportFormat) {
      case 'plain': {
        const lines: string[] = [raid.name, ''];
        raid.groups.forEach((group, index) => {
          lines.push(`Group ${index + 1}:`);
          group.forEach((player) => {
            if (player) {
              lines.push(`  ${player.name} - ${player.class} (${player.mainSpec?.replace(player.class, '') || ''})`);
            }
          });
          lines.push('');
        });
        return lines.join('\n');
      }
      case 'csv': {
        const lines: string[] = ['Group,Name,Class,Spec,Role'];
        raid.groups.forEach((group, index) => {
          group.forEach((player) => {
            if (player) {
              lines.push(`${index + 1},${player.name},${player.class},${player.mainSpec?.replace(player.class, '') || ''},${player.role}`);
            }
          });
        });
        return lines.join('\n');
      }
      case 'names': {
        const names: string[] = [];
        raid.groups.forEach((group) => {
          group.forEach((player) => {
            if (player) names.push(player.name);
          });
        });
        return names.join('\n');
      }
      case 'mrt': {
        const lines: string[] = [];
        raid.groups.forEach((group, index) => {
          const groupPlayers = group.filter(Boolean).map(p => p!.name);
          if (groupPlayers.length > 0) {
            lines.push(`Group${index + 1}:${groupPlayers.join(',')}`);
          }
        });
        return lines.join('\n');
      }
      case 'json': {
        const data = {
          name: raid.name,
          groups: raid.groups.map((group, index) => ({
            group: index + 1,
            members: group.filter(Boolean).map(p => ({
              name: p!.name,
              class: p!.class,
              spec: p!.mainSpec?.replace(p!.class, '') || '',
            })),
          })),
        };
        return JSON.stringify(data, null, 2);
      }
      default:
        return '';
    }
  };

  const copyExportToClipboard = () => {
    const content = getExportContent();
    navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
  };

  // Render player slot
  const renderPlayerSlot = (
    slot: Player | null,
    raidId: string,
    groupIndex: number,
    slotIndex: number
  ) => {
    const slotKey = `${raidId}-${groupIndex}-${slotIndex}`;
    const isDragOver = dragOverSlot === slotKey;
    const classColor = slot ? WOWSIMS_CLASS_COLORS[slot.class] || WOWSIMS_CLASS_COLORS.Unknown : null;
    const isPending = slot && isPendingPlayer(slot);

    return (
      <div
        key={slotKey}
        className={`h-8 flex items-center transition-all cursor-pointer border-2 border-black/60 rounded ${
          slot ? '' : 'bg-[#1a1a1a]'
        } ${isDragOver ? 'ring-2 ring-yellow-400/50' : ''} ${isPending ? 'ring-2 ring-yellow-500' : ''}`}
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
            <span className="flex-1 text-sm font-bold text-black text-center" style={{ textShadow: '0 0 2px rgba(255,255,255,0.5)' }}>
              {isPending ? '???' : slot.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removePlayerFromSlot(raidId, groupIndex, slotIndex);
              }}
              className="px-0.5 text-red-700 hover:text-red-500 screenshot-hide"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Render raid section
  const renderRaidSection = (raid: RaidConfig, compact: boolean = false) => {
    const totalAssigned = getRaidCount(raid.id);
    const maxPlayers = getRaidMax(raid.id);

    return (
      <div
        key={raid.id}
        ref={(el) => { raidRefs.current[raid.id] = el; }}
        className={`bg-[#0d1117] border border-[#30363d] rounded-lg ${compact ? '' : 'mb-6'}`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <Input
              value={raid.name}
              onChange={(e) => updateRaidName(raid.id, e.target.value)}
              className="w-36 h-8 text-lg bg-transparent border-none text-white font-bold hover:bg-white/10 focus:bg-white/10 px-1"
            />
            <span className="text-base text-gray-300 font-semibold">{totalAssigned}/{maxPlayers}</span>
          </div>
          <div className="flex gap-1 screenshot-hide">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => openScreenshotDialog(raid.id)} title="Screenshot">
              <Camera className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => clearRaid(raid.id)} title="Clear">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => openExportDialog(raid.id)} title="Export">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-2 flex justify-center">
          <div className="flex gap-1">
            {raid.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="w-[150px]">
                <div className="flex items-center justify-center gap-1 text-yellow-500 text-xs font-bold py-1 mb-1">
                  <Users className="h-4 w-4" />
                  Group {groupIndex + 1}
                </div>
                <div className="bg-[#111] border-2 border-[#444] rounded">
                  <div className="space-y-0.5 p-1">
                    {group.map((slot, slotIndex) => renderPlayerSlot(slot, raid.id, groupIndex, slotIndex))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render player in pool
  const renderPoolPlayer = (player: Player, targetRaidId: string) => {
    const isPending = isPendingPlayer(player);

    return (
      <div
        key={player.id}
        draggable
        onDragStart={(e) => handleDragStart(e, player, 'available')}
        onDragEnd={handleDragEnd}
        onClick={() => addPlayerToRaid(targetRaidId, player)}
        className={`flex items-center h-7 cursor-grab hover:brightness-110 border border-black/40 rounded mb-0.5 ${isPending ? 'ring-2 ring-yellow-500' : ''}`}
        style={{ backgroundColor: WOWSIMS_CLASS_COLORS[player.class] }}
      >
        <img src={getSpecIconUrl(player.mainSpec, player.class)} alt={player.mainSpec} className="w-5 h-5 pointer-events-none" />
        <span className="flex-1 text-xs font-medium text-black px-0.5 truncate pointer-events-none">
          {isPending ? '???' : player.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEditDialog(player);
          }}
          className="px-0.5 text-black/60 hover:text-black screenshot-hide"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeletePlayer(player);
          }}
          className="px-0.5 text-red-700 hover:text-red-500 screenshot-hide"
        >
          <Trash2 className="w-3 h-3" />
        </button>
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

  const mainRaid = raids.find(r => r.id === 'main-25');
  const splitRaids = raids.filter(r => r.id.startsWith('split-10'));

  // Get all players assigned to any 10-man split
  const getAssigned10ManPlayerIds = (): Set<string> => {
    const ids = new Set<string>();
    splitRaids.forEach(raid => {
      raid.groups.flat().filter(Boolean).forEach(p => ids.add(p!.id));
    });
    return ids;
  };

  const assigned10ManIds = getAssigned10ManPlayerIds();

  // Get available specs for edit form
  const availableSpecs = editForm.wowClass ? CLASS_SPECS[editForm.wowClass] || [] : [];
  const newPlayerSpecs = newPlayer.wowClass ? CLASS_SPECS[newPlayer.wowClass] || [] : [];

  // Role grouped players for pools
  const roleGroupedPlayers = groupPlayersByRole(unassignedPlayers);
  const roleGroupedFor10Man = groupPlayersByRole(players.filter(p => !assigned10ManIds.has(p.id)));

  return (
    <div
      className="min-h-screen bg-black text-white -m-6 p-4"
      onDragOver={handleDragOver}
      onDrop={handleDropToAvailable}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h1 className="text-xl font-bold">Roster</h1>
          <p className="text-gray-400 text-sm">Manage roster and assign to raids</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-[#5865F2] border-[#5865F2] text-white hover:bg-[#4752C4] h-7 text-xs"
            onClick={openRoleImportDialog}
          >
            <Upload className="h-3 w-3 mr-1" />
            Import from Discord
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-green-700 border-green-600 text-white hover:bg-green-600 h-7 text-xs"
            onClick={() => {
              setNewPlayer({ name: '', wowClass: '', mainSpec: '', notes: '', discordId: '', teamId: selectedTeam?.id || '' });
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Player
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-yellow-700 border-yellow-600 text-white hover:bg-yellow-600 h-7 text-xs"
            onClick={async () => {
              if (!selectedTeam) return;
              try {
                const res = await fetch('/api/players', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ teamId: selectedTeam.id }),
                });
                if (res.ok) {
                  const data = await res.json();
                  alert(data.message);
                  fetchPlayersAndAssignments();
                }
              } catch (error) {
                console.error('Failed to claim players:', error);
              }
            }}
          >
            <Users className="h-3 w-3 mr-1" />
            Claim Unassigned
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-red-700 border-red-600 text-white hover:bg-red-600 h-7 text-xs"
            onClick={async () => {
              if (!selectedTeam) return;
              if (!confirm(`Delete ALL players from ${selectedTeam.name}? This cannot be undone!`)) return;
              try {
                const res = await fetch(`/api/players/cleanup?teamId=${selectedTeam.id}&all=true`, {
                  method: 'DELETE',
                });
                if (res.ok) {
                  const data = await res.json();
                  alert(data.message);
                  fetchPlayersAndAssignments();
                } else {
                  alert('Failed to delete players');
                }
              } catch (error) {
                console.error('Failed to delete players:', error);
              }
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex items-stretch gap-8">
        {/* Left Side: All Raids */}
        <div className="flex-shrink-0">
          {mainRaid && renderRaidSection(mainRaid)}

          <div className="mt-4" ref={tenManSectionRef}>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-sm font-semibold text-gray-300">10-Man Splits</h2>
              <span className="text-xs text-gray-500">Players can be in both 25-man and 10-man</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setScreenshotRaidId('all-10-man');
                  setIsScreenshotDialogOpen(true);
                }}
              >
                <Camera className="h-4 w-4 mr-1" />
                Screenshot All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={openCleanupDialog}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Cleanup Channel
              </Button>
            </div>
            <div className="flex gap-3">
              {splitRaids.map(raid => (
                <div key={raid.id}>
                  {renderRaidSection(raid, true)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Role Columns */}
        <div className="flex-shrink-0 flex gap-6">
          {/* 25-Man Pool */}
          <div className="flex flex-col">
            <div className="text-base text-white font-bold mb-1">25-Man Pool</div>
            <div className="flex gap-1 flex-1">
              {(['Tank', 'Healer', 'Melee', 'Ranged'] as const).map((role) => (
                <div key={role} className="w-[100px] flex flex-col">
                  <div className="flex items-center justify-center gap-1 py-1 text-white text-xs font-bold" style={{ backgroundColor: ROLE_COLORS[role] }}>
                    <img src={ROLE_ICONS[role]} alt={role} className="w-4 h-4" />
                    {role}
                  </div>
                  <div className="bg-[#111] border border-[#333] flex-1 p-0.5 max-h-[400px] overflow-y-auto">
                    {roleGroupedPlayers[role].length === 0 ? (
                      <div className="py-2 text-center text-gray-600 text-[10px]">Empty</div>
                    ) : (
                      roleGroupedPlayers[role].map((player) => renderPoolPlayer(player, 'main-25'))
                    )}
                  </div>
                  <div className="text-center py-1 bg-[#1a1a1a] border-x border-b border-[#333] text-xs font-semibold">{roleGroupedPlayers[role].length}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 10-Man Pool */}
          <div className="flex flex-col">
            <div className="text-base text-white font-bold mb-1">10-Man Pool</div>
            <div className="flex gap-1 flex-1">
              {(['Tank', 'Healer', 'Melee', 'Ranged'] as const).map((role) => (
                <div key={`10m-${role}`} className="w-[100px] flex flex-col">
                  <div className="flex items-center justify-center gap-1 py-1 text-white text-xs font-bold" style={{ backgroundColor: ROLE_COLORS[role] }}>
                    <img src={ROLE_ICONS[role]} alt={role} className="w-4 h-4" />
                    {role}
                  </div>
                  <div className="bg-[#111] border border-[#333] flex-1 p-0.5 max-h-[400px] overflow-y-auto">
                    {roleGroupedFor10Man[role].length === 0 ? (
                      <div className="py-2 text-center text-gray-600 text-[10px]">Empty</div>
                    ) : (
                      roleGroupedFor10Man[role].map((player) => renderPoolPlayer(player, 'split-10-1'))
                    )}
                  </div>
                  <div className="text-center py-1 bg-[#1a1a1a] border-x border-b border-[#333] text-xs font-semibold">{roleGroupedFor10Man[role].length}</div>
                </div>
              ))}
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
              Import Discord Users
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Paste Discord User IDs (one per line) to create roster entries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Discord User IDs</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"123456789012345678\n234567890123456789\n345678901234567890"}
                className="min-h-[150px] bg-black border-gray-600 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Right-click user in Discord &rarr; Copy User ID (enable Developer Mode in settings)
              </p>
            </div>
            {importText && (
              <div className="text-sm text-gray-400">
                Found: {importText.split('\n').filter(line => /^\d{17,19}$/.test(line.trim())).length} valid Discord IDs
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleImportDiscordIds} disabled={isImporting || !importText.trim()}>
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {isImporting ? 'Importing...' : 'Import Players'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {editingPlayer && isPendingPlayer(editingPlayer) ? 'Configure Player' : 'Edit Player'}
            </DialogTitle>
            {editingPlayer?.discordId && (
              <DialogDescription className="text-gray-400">
                Discord ID: {editingPlayer.discordId}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Character Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter character name"
                className="bg-black border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Class</Label>
              <Select value={editForm.wowClass} onValueChange={(value) => setEditForm({ ...editForm, wowClass: value, mainSpec: '' })}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  {WOW_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls} className="text-white hover:bg-gray-800">
                      <span style={{ color: WOWSIMS_CLASS_COLORS[cls] }}>{cls}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Main Spec</Label>
              <Select value={editForm.mainSpec} onValueChange={(value) => setEditForm({ ...editForm, mainSpec: value })} disabled={!editForm.wowClass}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder="Select spec" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  {availableSpecs.map((spec) => (
                    <SelectItem key={spec} value={spec} className="text-white hover:bg-gray-800">
                      {spec.replace(editForm.wowClass, '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Notes (optional)</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="e.g., BiS wep P1-2"
                className="bg-black border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleSavePlayer} disabled={!editForm.name || !editForm.mainSpec || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Team</Label>
              <Select value={newPlayer.teamId} onValueChange={(value) => setNewPlayer({ ...newPlayer, teamId: value })}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-white hover:bg-gray-800">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Character Name</Label>
              <Input
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                placeholder="Enter character name"
                className="bg-black border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Class</Label>
              <Select value={newPlayer.wowClass} onValueChange={(value) => setNewPlayer({ ...newPlayer, wowClass: value, mainSpec: '' })}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  {WOW_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls} className="text-white hover:bg-gray-800">
                      <span style={{ color: WOWSIMS_CLASS_COLORS[cls] }}>{cls}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Main Spec</Label>
              <Select value={newPlayer.mainSpec} onValueChange={(value) => setNewPlayer({ ...newPlayer, mainSpec: value })} disabled={!newPlayer.wowClass}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder="Select spec" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  {newPlayerSpecs.map((spec) => (
                    <SelectItem key={spec} value={spec} className="text-white hover:bg-gray-800">
                      {spec.replace(newPlayer.wowClass, '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Discord ID (optional)</Label>
              <Input
                value={newPlayer.discordId}
                onChange={(e) => setNewPlayer({ ...newPlayer, discordId: e.target.value })}
                placeholder="e.g., 123456789012345678"
                className="bg-black border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Notes (optional)</Label>
              <Input
                value={newPlayer.notes}
                onChange={(e) => setNewPlayer({ ...newPlayer, notes: e.target.value })}
                placeholder="e.g., BiS wep P1-2"
                className="bg-black border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleAddPlayer} disabled={!newPlayer.teamId || !newPlayer.name || !newPlayer.mainSpec || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Export Roster
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Export Format:</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="plain" className="text-white hover:bg-gray-800">Plain Text</SelectItem>
                  <SelectItem value="csv" className="text-white hover:bg-gray-800">CSV</SelectItem>
                  <SelectItem value="names" className="text-white hover:bg-gray-800">Names Only</SelectItem>
                  <SelectItem value="mrt" className="text-white hover:bg-gray-800">MRT Format</SelectItem>
                  <SelectItem value="json" className="text-white hover:bg-gray-800">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={getExportContent()}
              readOnly
              className="min-h-[200px] bg-black border-gray-600 text-white font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="bg-transparent border-gray-600">
              Close
            </Button>
            <Button onClick={copyExportToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot Dialog */}
      <Dialog open={isScreenshotDialogOpen} onOpenChange={setIsScreenshotDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-400" />
              Screenshot Options
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent border-green-600 text-green-400 hover:bg-green-900/20"
              onClick={downloadScreenshot}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Screenshot
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-[#5865F2] border-[#5865F2] text-white hover:bg-[#4752C4]"
              onClick={openDiscordDialog}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Discord
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discord Send Dialog */}
      <Dialog open={isDiscordDialogOpen} onOpenChange={setIsDiscordDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#5865F2]" />
              Send to Discord
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Channel:</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder={loadingChannels ? "Loading..." : "Select channel"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700 max-h-[300px]">
                  {discordChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} className="text-white hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Title:</Label>
              <Input
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="Message title..."
                className="bg-black border-gray-600 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tagPlayers"
                checked={tagPlayers}
                onChange={(e) => setTagPlayers(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="tagPlayers" className="text-gray-300 cursor-pointer">Tag players</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscordDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={sendToDiscord} disabled={!selectedChannel || isSendingToDiscord} className="bg-[#5865F2] hover:bg-[#4752C4]">
              {isSendingToDiscord ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post All Dialog */}
      <Dialog open={isPostAllDialogOpen} onOpenChange={setIsPostAllDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#5865F2]" />
              Post All to Discord
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Channel:</Label>
              <Select value={postAllChannel} onValueChange={setPostAllChannel}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder={loadingChannels ? "Loading..." : "Select channel"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700 max-h-[300px]">
                  {discordChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} className="text-white hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Title:</Label>
              <Input
                value={postAllTitle}
                onChange={(e) => setPostAllTitle(e.target.value)}
                placeholder="Raid Compositions"
                className="bg-black border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Preview:</Label>
              <div className="bg-black border border-gray-700 rounded-md p-3 max-h-[200px] overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                {generatePostAllContent().content || <span className="text-gray-500">No players assigned</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPostAllDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={sendPostAllToDiscord} disabled={!postAllChannel || isSendingPostAll} className="bg-[#5865F2] hover:bg-[#4752C4]">
              {isSendingPostAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discord Role Import Dialog */}
      <Dialog open={isRoleImportDialogOpen} onOpenChange={setIsRoleImportDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#5865F2]" />
              Import from Discord Role
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a Discord role to import members as players. Optionally set class and spec for each player.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Discord Role:</Label>
              <Select value={selectedRoleId} onValueChange={handleRoleSelect}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700 max-h-[300px]">
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id} className="text-white hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color || '#99AAB5' }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoleId && (
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Members to import: {loadingMembers ? 'Loading...' : roleMembers.length}
                </Label>
                <div className="bg-black border border-gray-700 rounded-md p-2 max-h-[350px] overflow-y-auto">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : roleMembers.length === 0 ? (
                    <div className="text-center text-gray-500 py-2">No members found</div>
                  ) : (
                    <div className="space-y-2">
                      {roleMembers.map((member) => {
                        const config = memberConfigs[member.id] || { wowClass: '', mainSpec: '' };
                        const specsForClass = config.wowClass ? CLASS_SPECS[config.wowClass] || [] : [];
                        return (
                          <div key={member.id} className="flex items-center gap-2 text-sm p-2 bg-gray-900/50 rounded">
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0" />
                            )}
                            <span className="w-24 truncate flex-shrink-0" title={member.displayName}>{member.displayName}</span>
                            <Select
                              value={config.wowClass}
                              onValueChange={(value) => {
                                setMemberConfigs(prev => ({
                                  ...prev,
                                  [member.id]: { wowClass: value, mainSpec: '' }
                                }));
                              }}
                            >
                              <SelectTrigger className="bg-black border-gray-600 text-white h-7 w-24 text-xs">
                                <SelectValue placeholder="Class" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-gray-700">
                                {WOW_CLASSES.map((cls) => (
                                  <SelectItem key={cls} value={cls} className="text-white hover:bg-gray-800 text-xs">
                                    <span style={{ color: WOWSIMS_CLASS_COLORS[cls] }}>{cls}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={config.mainSpec}
                              onValueChange={(value) => {
                                setMemberConfigs(prev => ({
                                  ...prev,
                                  [member.id]: { ...prev[member.id], mainSpec: value }
                                }));
                              }}
                              disabled={!config.wowClass}
                            >
                              <SelectTrigger className="bg-black border-gray-600 text-white h-7 w-28 text-xs">
                                <SelectValue placeholder="Spec" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-gray-700">
                                {specsForClass.map((spec) => (
                                  <SelectItem key={spec} value={spec} className="text-white hover:bg-gray-800 text-xs">
                                    {spec.replace(config.wowClass, '')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Players without class/spec will be created with pending status.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleImportDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button
              onClick={handleImportFromRole}
              disabled={!selectedRoleId || roleMembers.length === 0 || isImportingRole || loadingMembers}
              className="bg-[#5865F2] hover:bg-[#4752C4]"
            >
              {isImportingRole ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {isImportingRole ? 'Importing...' : `Import ${roleMembers.length} Players`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Cleanup Bot Messages
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Remove all messages posted by the bot in a Discord channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Channel:</Label>
              <Select value={cleanupChannel} onValueChange={setCleanupChannel}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue placeholder={loadingChannels ? "Loading..." : "Select channel"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700 max-h-[300px]">
                  {discordChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} className="text-white hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
              <p className="text-sm text-yellow-200">
                This will delete the last 100 messages posted by the bot in the selected channel.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCleanupDialogOpen(false)} className="bg-transparent border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleCleanup} disabled={!cleanupChannel || isCleaningUp} className="bg-red-600 hover:bg-red-700">
              {isCleaningUp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isCleaningUp ? 'Cleaning up...' : 'Delete Messages'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
