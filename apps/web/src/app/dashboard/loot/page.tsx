'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Search, Plus, RefreshCw, Trash2, Save, RotateCcw, HelpCircle } from 'lucide-react';
import { ITEM_QUALITY_COLORS, getItemIconUrl } from '@/lib/wowhead';
import { useTeam } from '@/components/providers/team-provider';
import { ItemsTable } from '@/components/drops/items-table';
import { RaidersTable } from '@/components/drops/raiders-table';
import { RCImportDialog } from '@/components/drops/rc-import-dialog';
import { RCExportDialog } from '@/components/drops/rc-export-dialog';
import { RAIDS } from '@hooligans/shared';

type Player = {
  id: string;
  name: string;
  class: string;
  role: string;
  roleSubtype: string;
  joinedDate: string;
};

type TokenRedemption = {
  id: string;
  className: string;
  redemptionItem: {
    id: string;
    name: string;
    wowheadId: number;
    icon?: string;
    quality: number;
    bisFor?: string;
    lootRecords?: {
      id: string;
      player: { id: string; name: string; class: string } | null;
    }[];
  };
};

type BisPlayer = {
  id: string;
  name: string;
  class: string;
};

type LootItem = {
  id: string;
  itemId?: string;
  itemName: string;
  wowheadId?: number;
  quality?: number;
  icon?: string;
  slot?: string;
  playerId?: string;
  playerName?: string;
  playerClass?: string;
  response?: string;
  lootDate?: string;
  lootPrio?: string;
  bisPlayers?: string[];
  bisNextPhasePlayers?: string[];
  bisPlayersFromList?: BisPlayer[];
  bisNextPlayersFromList?: BisPlayer[];
  tokenRedemptions?: TokenRedemption[];
  sunmoteRedemption?: {
    id: string;
    sunmotesRequired: number;
    upgradedItem: {
      id: string;
      name: string;
      wowheadId: number;
      icon?: string;
      quality: number;
      lootRecords?: {
        id: string;
        player: { id: string; name: string; class: string } | null;
      }[];
    };
  };
};

type RaiderStats = {
  id: string;
  name: string;
  class: string;
  role: string;
  roleSubtype: string;
  lootThisRaid: number;
  totalLootCurrentPhase: number;
  bisPercent: number;
  totalItems: number;
  daysSinceLastItem: string;
};

type ParsedItem = {
  session: number;
  itemName: string;
  itemId: number;
  ilvl: number;
  quality: number;
};

type DatabaseItem = {
  id: string;
  name: string;
  wowheadId: number;
  icon?: string;
  quality: number;
  slot: string;
  raid: string;
  boss: string;
};

export default function DropsPage() {
  const { selectedTeam, isOfficer } = useTeam();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lootItems, setLootItems] = useState<LootItem[]>([]);
  const [lootHistory, setLootHistory] = useState<any[]>([]); // Finalized loot for stats
  const [raiders, setRaiders] = useState<RaiderStats[]>([]);
  // Add Item dialog state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<DatabaseItem[]>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      // Fetch players, current session loot, and finalized loot history in parallel
      const [playersRes, lootRes, historyRes] = await Promise.all([
        fetch(`/api/players?teamId=${selectedTeam.id}`),
        fetch(`/api/loot?teamId=${selectedTeam.id}`), // Current session (non-finalized)
        fetch(`/api/loot?teamId=${selectedTeam.id}&history=true`), // Finalized history for stats
      ]);

      let playersData: Player[] = [];
      let lootData: any[] = [];
      let historyData: any[] = [];

      if (playersRes.ok) {
        playersData = await playersRes.json();
        setPlayers(playersData);
      }

      if (historyRes.ok) {
        historyData = await historyRes.json();
        setLootHistory(historyData);
      }

      if (lootRes.ok) {
        lootData = await lootRes.json();
        // Transform loot records to LootItem format
        // Handle both: records with item relation AND records with direct itemName (from RC import)
        const items: LootItem[] = lootData.map((record: {
          id: string;
          itemId?: string;
          item?: {
            id: string;
            name: string;
            wowheadId?: number;
            quality?: number;
            icon?: string;
            slot?: string;
            lootPriority?: string;
            bisFor?: string;
            bisNextPhase?: string;
            tokenRedemptions?: TokenRedemption[];
            sunmoteRedemption?: {
              id: string;
              sunmotesRequired: number;
              upgradedItem: {
                id: string;
                name: string;
                wowheadId: number;
                icon?: string;
                quality: number;
                lootRecords?: {
                  id: string;
                  player: { id: string; name: string; class: string } | null;
                }[];
              };
            };
          };
          itemName?: string;
          wowheadId?: number;
          quality?: number;
          lootPrio?: string;
          player?: { id: string; name: string; class: string };
          response?: string;
          lootDate?: string;
          bisPlayersFromList?: BisPlayer[];
          bisNextPlayersFromList?: BisPlayer[];
        }) => {
          // Parse comma-separated player names into arrays
          const parsePlayerList = (str: string | null | undefined): string[] => {
            if (!str) return [];
            return str.split(',').map(s => s.trim()).filter(Boolean);
          };

          return {
            id: record.id,
            itemId: record.item?.id || record.itemId,
            itemName: record.item?.name || record.itemName || 'Unknown Item',
            wowheadId: record.item?.wowheadId || record.wowheadId,
            quality: record.item?.quality || record.quality || 4,
            icon: record.item?.icon,
            slot: record.item?.slot,
            playerId: record.player?.id,
            playerName: record.player?.name,
            playerClass: record.player?.class,
            response: record.response,
            lootDate: record.lootDate,
            lootPrio: record.item?.lootPriority || record.lootPrio,
            bisPlayers: parsePlayerList(record.item?.bisFor),
            bisNextPhasePlayers: parsePlayerList(record.item?.bisNextPhase),
            bisPlayersFromList: record.bisPlayersFromList,
            bisNextPlayersFromList: record.bisNextPlayersFromList,
            tokenRedemptions: record.item?.tokenRedemptions,
            sunmoteRedemption: record.item?.sunmoteRedemption,
          };
        });
        setLootItems(items);
      }

      // Calculate raider stats with both players and ALL loot data (history + current session)
      if (playersData.length > 0) {
        // Combine finalized history with current session for complete stats
        const allLootData = [...historyData, ...lootData];
        const raiderStats = calculateRaiderStats(playersData, allLootData, lootData);
        setRaiders(raiderStats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchData();
  }, [selectedTeam]);

  const calculateRaiderStats = (
    playersList: Player[],
    allLootRecords: { playerId: string; lootPoints?: number; lootDate?: string }[],
    currentSessionRecords?: { playerId: string; lootPoints?: number; lootDate?: string }[]
  ): RaiderStats[] => {
    const now = new Date();
    const sessionRecords = currentSessionRecords || allLootRecords;

    return playersList.map((player) => {
      // Total loot from ALL history (finalized + current)
      const playerTotalLoot = allLootRecords.filter((r) => r.playerId === player.id);
      const totalItems = playerTotalLoot.length;

      // LTR (Loot This Raid) - items assigned in CURRENT session only
      const playerSessionLoot = sessionRecords.filter((r) => r.playerId === player.id);
      const lootThisRaid = playerSessionLoot.length;

      // Calculate days since last item and total days in guild
      const totalDays = Math.max(1, Math.floor(
        (now.getTime() - new Date(player.joinedDate).getTime()) / (1000 * 60 * 60 * 24)
      ));

      let daysSinceLastItem = `-/${totalDays}`;
      if (playerTotalLoot.length > 0) {
        const lastLootDate = new Date(
          Math.max(...playerTotalLoot.map((r) => new Date(r.lootDate || 0).getTime()))
        );
        const daysSince = Math.floor((now.getTime() - lastLootDate.getTime()) / (1000 * 60 * 60 * 24));
        daysSinceLastItem = `${daysSince}/${totalDays}`;
      }

      return {
        id: player.id,
        name: player.name,
        class: player.class,
        role: player.role,
        roleSubtype: player.roleSubtype,
        lootThisRaid,
        totalLootCurrentPhase: totalItems,
        bisPercent: 0, // TODO: Calculate from PlayerBisStatus
        totalItems,
        daysSinceLastItem,
      };
    });
  };

  const handleAssignPlayer = async (itemId: string, playerId: string) => {
    const isUnassigning = !playerId;
    const player = players.find((p) => p.id === playerId);

    // Find the item being updated
    const targetItem = lootItems.find(item => item.id === itemId);
    const targetItemId = targetItem?.itemId;
    const previousPlayerId = targetItem?.playerId;
    const previousPlayer = previousPlayerId ? players.find(p => p.id === previousPlayerId) : null;

    // Optimistic update for immediate UI feedback
    const updatedItems = lootItems.map((item) => {
      if (item.id === itemId) {
        // Build updated BiS lists
        let newBisPlayers = item.bisPlayersFromList || [];
        let newBisNextPlayers = item.bisNextPlayersFromList || [];

        // If assigning, remove new player from BiS
        if (playerId) {
          newBisPlayers = newBisPlayers.filter(p => p.id !== playerId);
          newBisNextPlayers = newBisNextPlayers.filter(p => p.id !== playerId);
        }

        // If un-assigning and there was a previous player, add them back to BiS lists
        if (isUnassigning && previousPlayer && previousPlayerId) {
          const playerData = { id: previousPlayerId, name: previousPlayer.name, class: previousPlayer.class };
          // Add back to BiS if not already in list
          if (!newBisPlayers.find(p => p.id === previousPlayerId)) {
            newBisPlayers = [...newBisPlayers, playerData];
          }
          // Add back to BiS Next if not already in list
          if (!newBisNextPlayers.find(p => p.id === previousPlayerId)) {
            newBisNextPlayers = [...newBisNextPlayers, playerData];
          }
        }

        return {
          ...item,
          playerId: playerId || undefined,
          playerName: player?.name,
          playerClass: player?.class,
          bisPlayersFromList: newBisPlayers,
          bisNextPlayersFromList: newBisNextPlayers,
        };
      }
      // For other items with the same itemId
      if (targetItemId && item.itemId === targetItemId) {
        let newBisPlayers = item.bisPlayersFromList || [];
        let newBisNextPlayers = item.bisNextPlayersFromList || [];

        // If assigning, remove player from BiS
        if (playerId) {
          newBisPlayers = newBisPlayers.filter(p => p.id !== playerId);
          newBisNextPlayers = newBisNextPlayers.filter(p => p.id !== playerId);
        }

        // If un-assigning, add previous player back to both lists
        if (isUnassigning && previousPlayer && previousPlayerId) {
          const playerData = { id: previousPlayerId, name: previousPlayer.name, class: previousPlayer.class };
          if (!newBisPlayers.find(p => p.id === previousPlayerId)) {
            newBisPlayers = [...newBisPlayers, playerData];
          }
          if (!newBisNextPlayers.find(p => p.id === previousPlayerId)) {
            newBisNextPlayers = [...newBisNextPlayers, playerData];
          }
        }

        return {
          ...item,
          bisPlayersFromList: newBisPlayers,
          bisNextPlayersFromList: newBisNextPlayers,
        };
      }
      return item;
    });
    setLootItems(updatedItems);

    // Recalculate raider stats based on updated items
    const sessionRecords = updatedItems
      .filter(item => item.playerId)
      .map(item => ({
        playerId: item.playerId!,
        lootDate: item.lootDate,
      }));
    // Combine with history for total stats
    const allLootRecords = [...lootHistory, ...sessionRecords];
    const raiderStats = calculateRaiderStats(players, allLootRecords, sessionRecords);
    setRaiders(raiderStats);

    // Persist to database
    try {
      await fetch(`/api/loot/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerId || null }),
      });
    } catch (error) {
      console.error('Failed to assign player:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Optimistic update
    const updatedItems = lootItems.filter((item) => item.id !== itemId);
    setLootItems(updatedItems);

    // Recalculate raider stats
    const sessionRecords = updatedItems
      .filter(item => item.playerId)
      .map(item => ({
        playerId: item.playerId!,
        lootDate: item.lootDate,
      }));
    // Combine with history for total stats
    const allLootRecords = [...lootHistory, ...sessionRecords];
    const raiderStats = calculateRaiderStats(players, allLootRecords, sessionRecords);
    setRaiders(raiderStats);

    // Delete from database
    try {
      await fetch(`/api/loot/${itemId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      // Revert on error
      fetchData();
    }
  };

  const handleUpdateResponse = async (itemId: string, response: string) => {
    // Optimistic update
    setLootItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, response } : item))
    );

    // Persist to database
    try {
      await fetch(`/api/loot/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response || null }),
      });
    } catch (error) {
      console.error('Failed to update response:', error);
    }
  };

  const handleRCImport = async (items: ParsedItem[]) => {
    if (!selectedTeam) return;

    // Add imported items to the items table
    const newItems: LootItem[] = items.map((item, index) => ({
      id: `temp-${Date.now()}-${index}`,
      itemName: item.itemName,
      wowheadId: item.itemId,
      quality: item.quality,
    }));

    setLootItems((prev) => [...newItems, ...prev]);

    // TODO: Implement API call to save imported items
    try {
      const res = await fetch('/api/loot/import-rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          items: items.map((item) => ({
            itemName: item.itemName,
            wowheadId: item.itemId,
            quality: item.quality,
            ilvl: item.ilvl,
          })),
        }),
      });

      if (res.ok) {
        // Refresh data after import
        fetchData();
      }
    } catch (error) {
      console.error('Failed to import items:', error);
    }
  };

  const handleFinalizeSession = async () => {
    if (!selectedTeam) return;

    const assignedItems = lootItems.filter(item => item.playerId);
    const unassignedCount = lootItems.filter(item => !item.playerId).length;

    if (assignedItems.length === 0) {
      alert('No items have been assigned yet. Assign items to players before finalizing.');
      return;
    }

    const message = unassignedCount > 0
      ? `Save ${assignedItems.length} assigned items to loot history and clear ${unassignedCount} unassigned items?`
      : `Save ${assignedItems.length} assigned items to loot history?`;

    if (!confirm(message)) {
      return;
    }

    try {
      // Mark assigned items as finalized and delete unassigned items
      const res = await fetch(`/api/loot/finalize-session?teamId=${selectedTeam.id}`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        // Move assigned items from session to history
        const assignedItems = lootItems.filter(item => item.playerId);
        const newHistory = [...lootHistory, ...assignedItems.map(item => ({
          playerId: item.playerId,
          lootDate: item.lootDate,
        }))];
        setLootHistory(newHistory);
        // Clear local session state
        setLootItems([]);
        // Recalculate raider stats with updated history (no current session items)
        const raiderStats = calculateRaiderStats(players, newHistory, []);
        setRaiders(raiderStats);
        alert(`Session finalized! ${data.finalized} items saved to history.`);
      }
    } catch (error) {
      console.error('Failed to finalize session:', error);
    }
  };

  const handleNewSession = async () => {
    if (!selectedTeam) return;

    const totalCount = lootItems.length;
    if (totalCount === 0) {
      return;
    }

    const assignedCount = lootItems.filter(item => item.playerId).length;
    if (assignedCount > 0) {
      if (!confirm(`WARNING: This will delete ALL ${totalCount} items including ${assignedCount} assigned items. Use "Finalize Session" to save assigned items first. Continue anyway?`)) {
        return;
      }
    } else if (!confirm(`Clear all ${totalCount} unassigned items?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/loot/clear-session?teamId=${selectedTeam.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Clear all session items from local state (history remains)
        setLootItems([]);
        // Recalculate raider stats with just history (no current session)
        const raiderStats = calculateRaiderStats(players, lootHistory, []);
        setRaiders(raiderStats);
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  // Search items in database
  const handleItemSearch = async (query: string) => {
    setItemSearchQuery(query);
    if (query.length < 2) {
      setItemSearchResults([]);
      return;
    }
    setIsSearchingItems(true);
    try {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(query)}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setItemSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to search items:', error);
    } finally {
      setIsSearchingItems(false);
    }
  };

  // Add item from database as a drop
  const handleAddItemFromDb = async (item: DatabaseItem) => {
    if (!selectedTeam) return;
    setIsAddingItem(true);
    try {
      const res = await fetch('/api/loot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          teamId: selectedTeam.id,
          lootDate: new Date().toISOString(),
          phase: 'P5', // Default to current phase
        }),
      });

      if (res.ok) {
        // Refresh data to get the new item with all relations
        await fetchData();
        // Reset and close dialog
        setItemSearchQuery('');
        setItemSearchResults([]);
        setIsAddItemOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    } finally {
      setIsAddingItem(false);
    }
  };

  // All items (no filtering needed since search was removed)
  const filteredItems = lootItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drops</h1>
          <p className="text-muted-foreground">Track loot distribution and player gear progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isOfficer && (
            <>
              <Button variant="default" size="sm" onClick={handleFinalizeSession}>
                <Save className="h-4 w-4 mr-2" />
                Finalize Session
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewSession}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <RCImportDialog onImport={handleRCImport} />
            </>
          )}
          <RCExportDialog items={lootItems} />
          {/* RCLootCouncil Guide */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                RC Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>RCLootCouncil — HOOLIGANS Guide</DialogTitle>
                <DialogDescription>
                  How to use RCLootCouncil with our loot system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4 text-sm">
                {/* Basic Setup */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Basic Setup</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>All raiders install <span className="text-foreground font-medium">RCLootCouncil Classic</span></li>
                    <li>Raid Leader/ML types <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc start</code> to activate</li>
                  </ul>
                </div>

                {/* Our Loot System */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Our Loot System: Award Later</h3>
                  <p className="text-muted-foreground mb-3">We collect all loot during the raid and vote at the end.</p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-1">During Raid</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Boss dies → ML loots with &quot;Award Later&quot; checked</li>
                        <li>Item goes to ML&apos;s bags with trade timer</li>
                        <li>Keep pulling — no waiting around</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-1">After Last Boss</h4>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Everyone stay in raid group!</li>
                        <li>ML types <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc award</code></li>
                        <li>Loot Frame pops up for all raiders</li>
                        <li>Raiders: Click your response (MS / OS / Pass)</li>
                        <li>Council: Exports the responses and loot to platform, decides who gets what item, then imports back in-game</li>
                        <li>Trade items to winners</li>
                        <li>Disband</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
                  <p className="text-amber-500 font-medium">
                    ⚠️ Important: You must be in the raid group to vote. Don&apos;t leave early!
                  </p>
                </div>

                {/* Essential Commands */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Essential Commands</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Command</th>
                          <th className="text-left px-3 py-2 font-medium">What it does</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc start</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Activate addon as ML</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc award</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Start voting session with stored loot</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc list</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Show items waiting to be awarded</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc add bags</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Add all tradeable items from bags</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc open</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Open voting frame</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc history</code></td>
                          <td className="px-3 py-2 text-muted-foreground">View loot history</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">/rc config</code></td>
                          <td className="px-3 py-2 text-muted-foreground">Open settings</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {isOfficer && (
          <Dialog open={isAddItemOpen} onOpenChange={(open) => {
            setIsAddItemOpen(open);
            if (!open) {
              setItemSearchQuery('');
              setItemSearchResults([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Item from Database</DialogTitle>
                <DialogDescription>
                  Search for an item to add as a drop.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={itemSearchQuery}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                {isSearchingItems && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                  </div>
                )}
                {itemSearchResults.length > 0 && (
                  <div className="max-h-80 overflow-y-auto space-y-1 border rounded-md p-2">
                    {itemSearchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex items-center gap-3 w-full text-left hover:bg-muted/50 rounded-md p-2 transition-colors"
                        onClick={() => handleAddItemFromDb(item)}
                        disabled={isAddingItem}
                      >
                        <img
                          src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'small')}
                          alt=""
                          className="w-8 h-8 rounded flex-shrink-0"
                          style={{
                            borderWidth: 2,
                            borderStyle: 'solid',
                            borderColor: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4],
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-medium truncate"
                            style={{ color: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                          >
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.boss || item.raid} • {item.slot}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {itemSearchQuery.length >= 2 && !isSearchingItems && itemSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items found matching &quot;{itemSearchQuery}&quot;
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Loot Council Criteria */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground border-b border-border pb-3">
        <span className="font-medium text-foreground">Loot Criteria:</span>
        <span><span className="text-primary">Engagement</span> - participation & effort</span>
        <span><span className="text-primary">Attendance</span> - presence & preparation</span>
        <span><span className="text-primary">Performance</span> - output & mechanics</span>
        <span><span className="text-primary">Upgrade Value</span> - item improvement</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
        {/* Items Table (Left) */}
        <Card className="min-w-0">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Items ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ItemsTable
              items={filteredItems}
              players={players}
              onAssignPlayer={handleAssignPlayer}
              onUpdateResponse={handleUpdateResponse}
              onDeleteItem={handleDeleteItem}
              isOfficer={isOfficer}
            />
          </CardContent>
        </Card>

        {/* Raiders Table (Right) */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Raiders ({raiders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RaidersTable raiders={raiders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
