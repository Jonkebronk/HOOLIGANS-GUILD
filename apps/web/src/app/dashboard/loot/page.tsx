'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Search, Filter, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
  tokenRedemptions?: TokenRedemption[];
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
  const { selectedTeam } = useTeam();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lootItems, setLootItems] = useState<LootItem[]>([]);
  const [raiders, setRaiders] = useState<RaiderStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [raidFilter, setRaidFilter] = useState<string>('all');
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
      // Fetch players and loot records in parallel
      const [playersRes, lootRes] = await Promise.all([
        fetch(`/api/players?teamId=${selectedTeam.id}`),
        fetch(`/api/loot?teamId=${selectedTeam.id}`),
      ]);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);

        // Calculate raider stats from players and loot
        const raiderStats = calculateRaiderStats(playersData, []);
        setRaiders(raiderStats);
      }

      if (lootRes.ok) {
        const lootData = await lootRes.json();
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
          };
          itemName?: string;
          wowheadId?: number;
          quality?: number;
          lootPrio?: string;
          player?: { id: string; name: string; class: string };
          response?: string;
          lootDate?: string;
          bisPlayersFromList?: BisPlayer[];
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
            tokenRedemptions: record.item?.tokenRedemptions,
          };
        });
        setLootItems(items);

        // Update raider stats with loot data
        if (players.length > 0) {
          const raiderStats = calculateRaiderStats(players, lootData);
          setRaiders(raiderStats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, players]);

  useEffect(() => {
    fetchData();
  }, [selectedTeam]);

  const calculateRaiderStats = (
    playersList: Player[],
    lootRecords: { playerId: string; lootPoints?: number; lootDate?: string }[]
  ): RaiderStats[] => {
    const now = new Date();

    return playersList.map((player) => {
      const playerLoot = lootRecords.filter((r) => r.playerId === player.id);
      const totalItems = playerLoot.length;

      // Calculate days since last item
      let daysSinceLastItem = '0/0';
      if (playerLoot.length > 0) {
        const lastLootDate = new Date(
          Math.max(...playerLoot.map((r) => new Date(r.lootDate || 0).getTime()))
        );
        const daysSince = Math.floor((now.getTime() - lastLootDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.floor(
          (now.getTime() - new Date(player.joinedDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        daysSinceLastItem = `${daysSince}/${totalDays}`;
      } else {
        const totalDays = Math.floor(
          (now.getTime() - new Date(player.joinedDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        daysSinceLastItem = `0/${totalDays}`;
      }

      return {
        id: player.id,
        name: player.name,
        class: player.class,
        role: player.role,
        roleSubtype: player.roleSubtype,
        lootThisRaid: 0, // TODO: Calculate based on current raid session
        totalLootCurrentPhase: totalItems,
        bisPercent: 0, // TODO: Calculate from PlayerBisStatus
        totalItems,
        daysSinceLastItem,
      };
    });
  };

  const handleAssignPlayer = async (itemId: string, playerId: string) => {
    // Optimistic update
    const player = players.find((p) => p.id === playerId);
    setLootItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              playerId: playerId || undefined,
              playerName: player?.name,
              playerClass: player?.class,
            }
          : item
      )
    );

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

  const handleNewSession = async () => {
    if (!selectedTeam) return;

    const totalCount = lootItems.length;
    if (totalCount === 0) {
      return;
    }

    if (!confirm(`Clear all ${totalCount} items and start a new loot session?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/loot/clear-session?teamId=${selectedTeam.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Clear all items from local state
        setLootItems([]);
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

  // Filter items based on search and raid
  const filteredItems = lootItems.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.playerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRaid = raidFilter === 'all'; // TODO: Add raid field to items
    return matchesSearch && matchesRaid;
  });

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
          <Button variant="outline" size="sm" onClick={handleNewSession}>
            <Trash2 className="h-4 w-4 mr-2" />
            New Session
          </Button>
          <RCImportDialog onImport={handleRCImport} />
          <RCExportDialog items={lootItems} />
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
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items or players..."
                className="pl-10 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={raidFilter} onValueChange={setRaidFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Raid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Raids</SelectItem>
                {RAIDS.map((raid) => (
                  <SelectItem key={raid.name} value={raid.name}>
                    {raid.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
        {/* Items Table (Left) */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Items ({filteredItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ItemsTable
              items={filteredItems}
              players={players}
              onAssignPlayer={handleAssignPlayer}
              onUpdateResponse={handleUpdateResponse}
            />
          </CardContent>
        </Card>

        {/* Raiders Table (Right) */}
        <Card className="xl:w-[420px]">
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
