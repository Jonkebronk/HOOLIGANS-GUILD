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
import { Plus, Search, Filter, Package, Database, Sword, Upload, Loader2, Trash2, Pencil, Check, Users } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RAIDS, GEAR_SLOTS, CLASS_COLORS } from '@hooligans/shared';
import { getItemIconUrl, refreshWowheadTooltips, TBC_RAIDS, ITEM_QUALITY_COLORS } from '@/lib/wowhead';
import { useTeam } from '@/components/providers/team-provider';

type LootRecord = {
  id: string;
  lootDate: string;
  player: {
    id: string;
    name: string;
    class: string;
  } | null;
};

type Item = {
  id: string;
  name: string;
  slot: string;
  raid: string;
  boss: string;
  phase: string;
  wowheadId: number;
  icon?: string;
  quality: number;
  lootPriority?: string | null;
  bisFor?: string | null;
  bisNextPhase?: string | null;
  bisSpecs: { id: string; spec: string }[];
  lootRecords?: LootRecord[];
};

const PHASES = ['P1', 'P2', 'P3', 'P4', 'P5'];
const QUALITIES = [
  { value: '3', label: 'Rare (Blue)', color: ITEM_QUALITY_COLORS[3] },
  { value: '4', label: 'Epic (Purple)', color: ITEM_QUALITY_COLORS[4] },
  { value: '5', label: 'Legendary (Orange)', color: ITEM_QUALITY_COLORS[5] },
];

export default function ItemsPage() {
  const { selectedTeam } = useTeam();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [raidFilter, setRaidFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importZone, setImportZone] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportBossDialogOpen, setIsImportBossDialogOpen] = useState(false);
  const [isImportingBosses, setIsImportingBosses] = useState(false);
  const [bossImportResult, setBossImportResult] = useState<{ updated: number; notFound: number; mappingsLoaded?: number; itemToBossSize?: number; debug?: { sampleDbItems: number[]; sampleTmbItems: number[]; matchingIds?: number[]; uniqueBosses?: string[]; rawSample?: string } } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({ lootPriority: '', bisFor: [] as string[], bisNextPhase: [] as string[] });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string; class: string }[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    slot: '',
    raid: '',
    boss: '',
    phase: '',
    wowheadId: '',
    quality: '4', // Default to epic
  });

  useEffect(() => {
    fetchItems();
    if (selectedTeam) {
      fetchPlayers();
    }
  }, [selectedTeam]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [items]);

  // Parse zone ID from Wowhead URL like https://www.wowhead.com/tbc/zone=3457/karazhan
  const parseZoneFromUrl = (url: string): string | null => {
    const match = url.match(/zone=(\d+)/);
    return match ? match[1] : null;
  };

  const handleUrlChange = (url: string) => {
    setImportUrl(url);
    const zoneId = parseZoneFromUrl(url);
    if (zoneId) {
      // Check if this zone ID matches any of our TBC_RAIDS
      const matchingRaid = TBC_RAIDS.find(raid => raid.id === zoneId);
      if (matchingRaid) {
        setImportZone(zoneId);
      }
    }
  };

  const handleZoneSelectChange = (zoneId: string) => {
    setImportZone(zoneId);
    // Update URL field to show the Wowhead URL for this zone
    const raid = TBC_RAIDS.find(r => r.id === zoneId);
    if (raid) {
      setImportUrl(`https://www.wowhead.com/tbc/zone=${zoneId}/${raid.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    }
  };

  const handleImportZone = async () => {
    if (!importUrl || !importZone) {
      setImportError('Please enter a Wowhead URL and select a raid zone');
      return;
    }

    const zoneId = parseZoneFromUrl(importUrl);
    if (!zoneId) {
      setImportError('Invalid Wowhead URL. Expected format: https://www.wowhead.com/tbc/zone=3457/karazhan');
      return;
    }

    const selectedRaid = TBC_RAIDS.find(r => r.id === importZone);
    if (!selectedRaid) {
      setImportError('Please select a raid zone');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const res = await fetch('/api/items/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: parseInt(zoneId),
          raidName: selectedRaid.name,
          phase: selectedRaid.phase,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Refresh items list
        await fetchItems();
        setIsImportDialogOpen(false);
        setImportUrl('');
        setImportZone('');

        // Show detailed results
        let message = `Imported ${data.imported} items from ${selectedRaid.name}`;
        if (data.skipped > 0) {
          message += `\n${data.skipped} items were already in the database`;
        }
        if (data.errors && data.errors.length > 0) {
          message += `\n\nSome errors occurred:\n${data.errors.slice(0, 3).join('\n')}`;
        }
        alert(message);
      } else {
        setImportError(data.error || 'Failed to import items');
      }
    } catch (error) {
      console.error('Failed to import:', error);
      setImportError('Failed to import items. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRaid = async () => {
    if (raidFilter === 'all') return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items?raid=${encodeURIComponent(raidFilter)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        await fetchItems();
        setIsDeleteDialogOpen(false);
        setRaidFilter('all');
        alert(`Deleted ${data.deleted} items from ${raidFilter}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete items');
      }
    } catch (error) {
      console.error('Failed to delete raid items:', error);
      alert('Failed to delete items. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportBosses = async () => {
    setIsImportingBosses(true);
    setBossImportResult(null);
    try {
      const res = await fetch('/api/items/import-bosses', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setBossImportResult({
          updated: data.updated,
          notFound: data.notFound,
          sourcesLoaded: data.sourcesLoaded,
          mappingsLoaded: data.mappingsLoaded,
          itemToBossSize: data.itemToBossSize,
          debug: data.debug,
        });
        // Refresh items list
        if (data.updated > 0) {
          await fetchItems();
        }
      } else {
        alert(data.error || 'Failed to import boss data');
      }
    } catch (error) {
      console.error('Failed to import boss data:', error);
      alert('Failed to import boss data. Please try again.');
    } finally {
      setIsImportingBosses(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.wowheadId || !newItem.name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          wowheadId: parseInt(newItem.wowheadId),
          slot: newItem.slot,
          raid: newItem.raid,
          boss: newItem.boss || null,
          phase: newItem.phase,
          quality: parseInt(newItem.quality),
        }),
      });

      if (res.ok) {
        const item = await res.json();
        setItems([...items, item]);
        setNewItem({ name: '', slot: '', raid: '', boss: '', phase: '', wowheadId: '', quality: '4' });
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setSaving(false);
    }
  };

  const fetchPlayers = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/players?teamId=${selectedTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const parsePlayerList = (str: string | null | undefined): string[] => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleOpenEditDialog = async (item: Item) => {
    setEditingItem(item);
    setEditForm({
      lootPriority: item.lootPriority || '',
      bisFor: parsePlayerList(item.bisFor),
      bisNextPhase: parsePlayerList(item.bisNextPhase),
    });
    setIsEditDialogOpen(true);

    // Fetch players list if not already loaded
    if (players.length === 0) {
      fetchPlayers();
    }

    // Load full item details including loot records
    setLoadingItemDetails(true);
    try {
      const res = await fetch(`/api/items/${item.id}`);
      if (res.ok) {
        const fullItem = await res.json();
        setEditingItem(fullItem);
        setEditForm({
          lootPriority: fullItem.lootPriority || '',
          bisFor: parsePlayerList(fullItem.bisFor),
          bisNextPhase: parsePlayerList(fullItem.bisNextPhase),
        });
      }
    } catch (error) {
      console.error('Failed to load item details:', error);
    } finally {
      setLoadingItemDetails(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      // Convert arrays to comma-separated strings for storage
      const dataToSave = {
        lootPriority: editForm.lootPriority,
        bisFor: editForm.bisFor.join(', '),
        bisNextPhase: editForm.bisNextPhase.join(', '),
      };

      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        // Update local state
        setItems(items.map(item =>
          item.id === editingItem.id
            ? { ...item, ...dataToSave }
            : item
        ));
        setIsEditDialogOpen(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRaid = raidFilter === 'all' || item.raid === raidFilter;
    const matchesSlot = slotFilter === 'all' || item.slot === slotFilter;
    const matchesPhase = phaseFilter === 'all' || item.phase === phaseFilter;
    return matchesSearch && matchesRaid && matchesSlot && matchesPhase;
  });

  const formatSpec = (spec: string) => {
    return spec.replace(/([A-Z])/g, ' $1').trim();
  };

  const bisItemsCount = items.filter(i => i.bisSpecs && i.bisSpecs.length > 0).length;
  const uniqueRaids = new Set(items.map(i => i.raid)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="space-y-6 min-h-screen -m-6 p-6"
      style={{
        backgroundImage: 'url(https://raw.githubusercontent.com/wowsims/tbc/master/assets/tbc.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Items Database</h1>
          <p className="text-muted-foreground">Manage raid items and BiS assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import Zone</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from Wowhead Zone</DialogTitle>
                <DialogDescription>Import all items from a raid zone loot table.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Wowhead Zone URL</Label>
                  <Input
                    placeholder="https://www.wowhead.com/tbc/zone=3457/karazhan"
                    value={importUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a Wowhead zone URL - the raid will be auto-selected
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Raid Zone</Label>
                  <Select value={importZone} onValueChange={handleZoneSelectChange}>
                    <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                    <SelectContent>
                      {TBC_RAIDS.map((raid) => (
                        <SelectItem key={raid.id} value={raid.id}>
                          {raid.name} ({raid.phase})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Items will be assigned to this raid in the database
                  </p>
                </div>
                {importError && (
                  <p className="text-sm text-red-500">{importError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button onClick={handleImportZone} disabled={!importZone || !importUrl || isImporting}>
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isImporting ? 'Importing...' : 'Import Items'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isImportBossDialogOpen} onOpenChange={setIsImportBossDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Users className="h-4 w-4 mr-2" />Import Bosses</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Boss Data from TMB</DialogTitle>
                <DialogDescription>
                  Fetch boss drop information from That&apos;s My BiS database and update items with missing boss names.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  This will update all items that currently have &quot;Unknown&quot; boss with the correct boss name from the TMB TBC database.
                </p>
                {bossImportResult && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm space-y-2">
                    <p className="text-green-500">Updated {bossImportResult.updated} items with boss data</p>
                    {bossImportResult.notFound > 0 && (
                      <p className="text-muted-foreground">{bossImportResult.notFound} items not found in TMB database</p>
                    )}
                    {bossImportResult.mappingsLoaded !== undefined && (
                      <div className="text-xs text-muted-foreground border-t pt-2 mt-2 space-y-1">
                        <p>TMB Mappings loaded: {bossImportResult.mappingsLoaded}</p>
                        <p>Unique items in TMB: {bossImportResult.itemToBossSize}</p>
                        {bossImportResult.debug && (
                          <>
                            <p className="font-medium mt-2">Sample DB Item IDs (wowheadId):</p>
                            <p className="font-mono">{bossImportResult.debug.sampleDbItems?.join(', ') || 'none'}</p>
                            <p className="font-medium mt-1">Sample TMB Item IDs:</p>
                            <p className="font-mono">{bossImportResult.debug.sampleTmbItems?.join(', ') || 'none'}</p>
                            <p className="font-medium mt-1">Matching IDs found:</p>
                            <p className="font-mono">{bossImportResult.debug.matchingIds?.length || 0} - {bossImportResult.debug.matchingIds?.join(', ') || 'none'}</p>
                            {bossImportResult.debug.uniqueBosses && bossImportResult.debug.uniqueBosses.length > 0 && (
                              <>
                                <p className="font-medium mt-1">Bosses found in TMB:</p>
                                <p className="font-mono text-[10px]">{bossImportResult.debug.uniqueBosses.join(', ')}</p>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportBossDialogOpen(false)} disabled={isImportingBosses}>
                  Close
                </Button>
                <Button onClick={handleImportBosses} disabled={isImportingBosses}>
                  {isImportingBosses ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isImportingBosses ? 'Importing...' : 'Import Boss Data'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Single Item</DialogTitle>
                <DialogDescription>Add a new item by Wowhead ID.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g., Warglaive of Azzinoth"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wowheadId">Wowhead Item ID</Label>
                  <Input
                    id="wowheadId"
                    value={newItem.wowheadId}
                    onChange={(e) => setNewItem({ ...newItem, wowheadId: e.target.value })}
                    placeholder="e.g., 32837"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find the ID in the Wowhead URL: wowhead.com/tbc/item=<strong>32837</strong>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slot">Slot</Label>
                    <Select value={newItem.slot} onValueChange={(value) => setNewItem({ ...newItem, slot: value })}>
                      <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                      <SelectContent>
                        {GEAR_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phase">Phase</Label>
                    <Select value={newItem.phase} onValueChange={(value) => setNewItem({ ...newItem, phase: value })}>
                      <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                      <SelectContent>
                        {PHASES.map((phase) => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raid">Raid</Label>
                    <Select value={newItem.raid} onValueChange={(value) => setNewItem({ ...newItem, raid: value })}>
                      <SelectTrigger><SelectValue placeholder="Select raid" /></SelectTrigger>
                      <SelectContent>
                        {RAIDS.map((raid) => (
                          <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quality">Quality</Label>
                    <Select value={newItem.quality} onValueChange={(value) => setNewItem({ ...newItem, quality: value })}>
                      <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                      <SelectContent>
                        {QUALITIES.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            <span style={{ color: q.color }}>{q.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddItem} disabled={!newItem.wowheadId || !newItem.name || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">items in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BiS Items</CardTitle>
            <Sword className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{bisItemsCount}</div>
            <p className="text-xs text-muted-foreground">items marked as BiS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raids Covered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueRaids}</div>
            <p className="text-xs text-muted-foreground">different raids</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={raidFilter} onValueChange={setRaidFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Raid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Raids</SelectItem>
                {RAIDS.map((raid) => (
                  <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Slots</SelectItem>
                {GEAR_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {raidFilter !== 'all' && (
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />Delete Raid
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete All Items from {raidFilter}?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete all {filteredItems.filter(i => i.raid === raidFilter).length} items from {raidFilter}. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteRaid} disabled={isDeleting}>
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {isDeleting ? 'Deleting...' : 'Delete All'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Yet</h3>
              <p className="text-muted-foreground mb-4">Add items manually or import from Wowhead zone pages.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />Import Zone
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {filteredItems.length} of {items.length} items
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenEditDialog(item)}
                  >
                    {/* Top Row: Item Info */}
                    <div className="flex items-center gap-4">
                      <a
                        href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-wh-icon-size="0"
                        className="flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                          alt={item.name}
                          className="w-9 h-9 rounded"
                          style={{ borderWidth: 2, borderStyle: 'solid', borderColor: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                        />
                      </a>
                      <div className="min-w-0 w-64 lg:w-72">
                        <a
                          href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wh-icon-size="0"
                          className="font-medium truncate block hover:underline"
                          style={{ color: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.name}
                        </a>
                      </div>
                      <div className="hidden sm:block w-20 text-sm text-muted-foreground">
                        {item.slot}
                      </div>
                      <div className="hidden md:block w-28 text-sm text-muted-foreground truncate">
                        {item.raid}
                      </div>
                      <div className="hidden lg:block w-20 text-sm text-muted-foreground truncate">
                        {item.boss || '-'}
                      </div>
                      <div className="w-10 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-muted">{item.phase}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(item); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Bottom Row: Loot Council Info */}
                    {(item.lootPriority || item.bisFor || item.bisNextPhase || (item.lootRecords && item.lootRecords.length > 0)) && (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 ml-13 pl-[52px] text-xs">
                        {item.lootPriority && (
                          <div>
                            <span className="text-muted-foreground">Loot Priority: </span>
                            <span className="text-yellow-500">{item.lootPriority}</span>
                          </div>
                        )}
                        {item.bisFor && (
                          <div>
                            <span className="text-muted-foreground">BiS: </span>
                            <span className="text-purple-400">{item.bisFor}</span>
                          </div>
                        )}
                        {item.bisNextPhase && (
                          <div>
                            <span className="text-muted-foreground">BiS Next Phase: </span>
                            <span className="text-blue-400">{item.bisNextPhase}</span>
                          </div>
                        )}
                        {item.lootRecords && item.lootRecords.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Looted by: </span>
                            {item.lootRecords.filter(r => r.player).map((record, idx) => (
                              <span key={record.id}>
                                {idx > 0 && ', '}
                                <span style={{ color: CLASS_COLORS[record.player!.class] }}>
                                  {record.player!.name}
                                </span>
                              </span>
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
        </>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingItem && (
                <>
                  <img
                    src={getItemIconUrl(editingItem.icon || 'inv_misc_questionmark', 'medium')}
                    alt={editingItem.name}
                    className="w-10 h-10 rounded"
                    style={{
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: ITEM_QUALITY_COLORS[editingItem.quality] || ITEM_QUALITY_COLORS[4]
                    }}
                  />
                  <span style={{ color: ITEM_QUALITY_COLORS[editingItem?.quality || 4] }}>
                    {editingItem.name}
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Edit loot council information for this item.
            </DialogDescription>
          </DialogHeader>

          {loadingItemDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Loot Priority</Label>
                <Textarea
                  placeholder="e.g., Tanks > Melee DPS > Hunters"
                  value={editForm.lootPriority}
                  onChange={(e) => setEditForm({ ...editForm, lootPriority: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>BiS For (Current Phase)</Label>
                <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
                  {players.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => (
                        <label
                          key={player.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1"
                        >
                          <Checkbox
                            checked={editForm.bisFor.includes(player.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditForm({ ...editForm, bisFor: [...editForm.bisFor, player.name] });
                              } else {
                                setEditForm({ ...editForm, bisFor: editForm.bisFor.filter(n => n !== player.name) });
                              }
                            }}
                          />
                          <span style={{ color: CLASS_COLORS[player.class] }}>{player.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading players...</p>
                  )}
                </div>
                {editForm.bisFor.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {editForm.bisFor.join(', ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>BiS Next Phase</Label>
                <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
                  {players.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => (
                        <label
                          key={player.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1"
                        >
                          <Checkbox
                            checked={editForm.bisNextPhase.includes(player.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditForm({ ...editForm, bisNextPhase: [...editForm.bisNextPhase, player.name] });
                              } else {
                                setEditForm({ ...editForm, bisNextPhase: editForm.bisNextPhase.filter(n => n !== player.name) });
                              }
                            }}
                          />
                          <span style={{ color: CLASS_COLORS[player.class] }}>{player.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading players...</p>
                  )}
                </div>
                {editForm.bisNextPhase.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {editForm.bisNextPhase.join(', ')}
                  </p>
                )}
              </div>

              {/* Looted By Section */}
              <div className="space-y-2">
                <Label>Looted By</Label>
                <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                  {editingItem?.lootRecords && editingItem.lootRecords.length > 0 ? (
                    <div className="space-y-1">
                      {editingItem.lootRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between text-sm">
                          <span style={{ color: record.player ? CLASS_COLORS[record.player.class] : undefined }}>
                            {record.player?.name || 'Unknown'}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(record.lootDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No loot records found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
