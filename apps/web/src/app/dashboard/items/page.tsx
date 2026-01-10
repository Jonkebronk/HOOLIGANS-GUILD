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
import { Plus, Search, Filter, Package, Database, Sword, Upload, Loader2, Trash2 } from 'lucide-react';
import { RAIDS, GEAR_SLOTS } from '@hooligans/shared';
import { getItemIconUrl, refreshWowheadTooltips, TBC_RAIDS, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

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
  bisSpecs: { id: string; spec: string }[];
};

const PHASES = ['P1', 'P2', 'P3', 'P4', 'P5'];
const QUALITIES = [
  { value: '3', label: 'Rare (Blue)', color: ITEM_QUALITY_COLORS[3] },
  { value: '4', label: 'Epic (Purple)', color: ITEM_QUALITY_COLORS[4] },
  { value: '5', label: 'Legendary (Orange)', color: ITEM_QUALITY_COLORS[5] },
];

export default function ItemsPage() {
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
  }, []);

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
    <div className="space-y-6">
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
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <a
                      href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                        alt={item.name}
                        className="w-9 h-9 rounded flex-shrink-0"
                        style={{ borderWidth: 2, borderStyle: 'solid', borderColor: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                      />
                    </a>
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-medium truncate block"
                        style={{ color: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div className="hidden sm:block w-24 text-sm text-muted-foreground">
                      {item.slot}
                    </div>
                    <div className="hidden md:block w-32 text-sm text-muted-foreground truncate">
                      {item.raid}
                    </div>
                    <div className="hidden lg:block w-24 text-sm text-muted-foreground">
                      {item.boss || '-'}
                    </div>
                    <div className="w-12 text-center">
                      <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-muted">{item.phase}</span>
                    </div>
                    {item.bisSpecs && item.bisSpecs.length > 0 ? (
                      <div className="hidden xl:flex gap-1 w-40">
                        {item.bisSpecs.slice(0, 2).map((bisSpec) => (
                          <span key={bisSpec.id} className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 truncate">
                            {formatSpec(bisSpec.spec)}
                          </span>
                        ))}
                        {item.bisSpecs.length > 2 && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                            +{item.bisSpecs.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="hidden xl:block w-40" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
