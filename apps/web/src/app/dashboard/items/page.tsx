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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Package, Database, Sword, Upload, Loader2, Trash2, Pencil, Check, Users, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RAIDS, GEAR_SLOTS, CLASS_COLORS, ITEM_SOURCES } from '@hooligans/shared';
import { getItemIconUrl, refreshWowheadTooltips, TBC_RAIDS, ITEM_QUALITY_COLORS } from '@/lib/wowhead';
import { useTeam } from '@/components/providers/team-provider';
import { getSpecShortNameColor } from '@/lib/specs';

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
  { value: '0', label: 'Poor (Gray)', color: ITEM_QUALITY_COLORS[0] },
  { value: '1', label: 'Common (White)', color: ITEM_QUALITY_COLORS[1] },
  { value: '2', label: 'Uncommon (Green)', color: ITEM_QUALITY_COLORS[2] },
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
  // Wowhead URL import state
  const [isWowheadImportOpen, setIsWowheadImportOpen] = useState(false);
  const [wowheadUrls, setWowheadUrls] = useState('');
  const [importStage, setImportStage] = useState<'input' | 'review'>('input');
  const [fetchedItems, setFetchedItems] = useState<{
    wowheadId: number;
    name: string;
    icon: string;
    quality: number;
    slot: string;
    boss: string;
    phase: string;
    raid: string;
    url: string;
  }[]>([]);
  const [fetchErrors, setFetchErrors] = useState<{ url: string; error: string }[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportBossDialogOpen, setIsImportBossDialogOpen] = useState(false);
  const [isImportingBosses, setIsImportingBosses] = useState(false);
  const [bossImportResult, setBossImportResult] = useState<{ updated: number; notFound: number; mappingsLoaded?: number; itemToBossSize?: number; debug?: { sampleDbItems: number[]; sampleTmbItems: number[]; matchingIds?: number[]; uniqueBosses?: string[]; rawSample?: string } } | null>(null);
  const [isFixingPhases, setIsFixingPhases] = useState(false);
  const [isSyncingBis, setIsSyncingBis] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    wowheadId: '',
    slot: '',
    phase: '',
    quality: '4',
    boss: '',
    raid: '',
    lootPriority: '',
    bisFor: [] as string[],
    bisNextPhase: [] as string[]
  });
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

  // Fetch items from Wowhead URLs
  const handleFetchWowheadItems = async () => {
    if (!wowheadUrls.trim()) {
      return;
    }

    const urls = wowheadUrls.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;

    setIsFetchingItems(true);
    setFetchErrors([]);

    try {
      const res = await fetch('/api/items/import-wowhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      const data = await res.json();

      if (res.ok) {
        // Add default values - user will fill in raid/phase/source per item
        const itemsWithDefaults = (data.items || []).map((item: { wowheadId: number; name: string; icon: string; quality: number; slot: string; url: string }) => ({
          ...item,
          raid: '',
          phase: '',
          boss: '',
        }));
        setFetchedItems(itemsWithDefaults);
        setFetchErrors(data.errors || []);
        setImportStage('review');
      } else {
        setFetchErrors([{ url: 'API', error: data.error || 'Failed to fetch items' }]);
      }
    } catch (error) {
      console.error('Failed to fetch Wowhead items:', error);
      setFetchErrors([{ url: 'API', error: 'Failed to fetch items. Please try again.' }]);
    } finally {
      setIsFetchingItems(false);
    }
  };

  // Update a fetched item field
  const updateFetchedItem = (index: number, field: string, value: string) => {
    setFetchedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      // Convert quality to number
      if (field === 'quality') {
        return { ...item, quality: parseInt(value) };
      }
      return { ...item, [field]: value };
    }));
  };

  // Remove item from import list
  const removeFetchedItem = (index: number) => {
    setFetchedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save all fetched items to database
  const handleSaveWowheadItems = async () => {
    if (fetchedItems.length === 0) return;

    setIsSavingImport(true);
    let saved = 0;
    const errors: string[] = [];

    for (const item of fetchedItems) {
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            wowheadId: item.wowheadId,
            icon: item.icon,
            quality: item.quality,
            slot: item.slot,
            raid: item.raid,
            boss: item.boss,
            phase: item.phase,
          }),
        });

        if (res.ok) {
          saved++;
        } else {
          const data = await res.json();
          errors.push(`${item.name}: ${data.error || 'Failed to save'}`);
        }
      } catch (error) {
        errors.push(`${item.name}: Network error`);
      }
    }

    setIsSavingImport(false);

    if (errors.length > 0) {
      alert(`Saved ${saved} items. Errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
    } else {
      alert(`Successfully imported ${saved} items!`);
    }

    // Reset and close
    setIsWowheadImportOpen(false);
    setWowheadUrls('');
    setFetchedItems([]);
    setImportStage('input');
    await fetchItems();
  };

  // Reset wowhead import dialog
  const resetWowheadImport = () => {
    setWowheadUrls('');
    setFetchedItems([]);
    setFetchErrors([]);
    setImportStage('input');
  };

  const handleFixPhases = async () => {
    if (!confirm('This will update all items to have the correct phase based on their raid. Continue?')) {
      return;
    }

    setIsFixingPhases(true);
    try {
      const res = await fetch('/api/items/fix-phases', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert(`Fixed phases for ${data.totalUpdated} items!`);
        await fetchItems();
      } else {
        alert(data.error || 'Failed to fix phases');
      }
    } catch (error) {
      console.error('Failed to fix phases:', error);
      alert('Failed to fix phases. Please try again.');
    } finally {
      setIsFixingPhases(false);
    }
  };

  const handleSyncBis = async () => {
    if (!confirm('This will sync all items\' BiS information from BiS presets. Continue?')) {
      return;
    }

    setIsSyncingBis(true);
    try {
      const res = await fetch('/api/items/sync-bis', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert(`Synced BiS data for ${data.updatedCount} items from ${data.configCount} BiS configurations!`);
        await fetchItems();
      } else {
        alert(data.error || 'Failed to sync BiS');
      }
    } catch (error) {
      console.error('Failed to sync BiS:', error);
      alert('Failed to sync BiS. Please try again.');
    } finally {
      setIsSyncingBis(false);
    }
  };

  // Extract wowhead ID from URL or plain number
  const parseWowheadId = (input: string): number | null => {
    if (!input) return null;
    // If it's just a number, return it
    const num = parseInt(input);
    if (!isNaN(num) && num > 0) return num;
    // Try to extract from URL like https://www.wowhead.com/tbc/item=32837/...
    const match = input.match(/item[=\/](\d+)/i);
    if (match) return parseInt(match[1]);
    return null;
  };

  const handleAddItem = async () => {
    const wowheadId = parseWowheadId(newItem.wowheadId);

    if (!wowheadId || !newItem.name) {
      alert('Item Name and valid Wowhead ID are required');
      return;
    }
    if (!newItem.slot) {
      alert('Please select a slot');
      return;
    }
    if (!newItem.raid) {
      alert('Please select a raid');
      return;
    }
    if (!newItem.phase) {
      alert('Please select a phase');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          wowheadId: wowheadId,
          slot: newItem.slot,
          raid: newItem.raid,
          boss: newItem.boss || null,
          phase: newItem.phase,
          quality: parseInt(newItem.quality),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setItems([...items, data]);
        setNewItem({ name: '', slot: '', raid: '', boss: '', phase: '', wowheadId: '', quality: '4' });
        setIsAddDialogOpen(false);
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
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
      name: item.name || '',
      wowheadId: item.wowheadId?.toString() || '',
      slot: item.slot || '',
      phase: item.phase || '',
      quality: item.quality?.toString() || '4',
      boss: item.boss || '',
      raid: item.raid || '',
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
          name: fullItem.name || '',
          wowheadId: fullItem.wowheadId?.toString() || '',
          slot: fullItem.slot || '',
          phase: fullItem.phase || '',
          quality: fullItem.quality?.toString() || '4',
          boss: fullItem.boss || '',
          raid: fullItem.raid || '',
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
        name: editForm.name,
        wowheadId: editForm.wowheadId ? parseInt(editForm.wowheadId) : null,
        slot: editForm.slot,
        phase: editForm.phase,
        quality: parseInt(editForm.quality),
        boss: editForm.boss,
        raid: editForm.raid,
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
        // Update local state - refresh items to get updated data
        await fetchItems();
        setIsEditDialogOpen(false);
        setEditingItem(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save item');
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
          <Dialog open={isWowheadImportOpen} onOpenChange={(open) => {
            setIsWowheadImportOpen(open);
            if (!open) {
              resetWowheadImport();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import from Wowhead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {importStage === 'input' ? 'Import from Wowhead URLs' : `Review Items (${fetchedItems.length})`}
                </DialogTitle>
                <DialogDescription>
                  {importStage === 'input'
                    ? 'Paste Wowhead item URLs (one per line), then review and edit before saving'
                    : 'Review and edit each item before importing to the database'}
                </DialogDescription>
              </DialogHeader>

              {importStage === 'input' ? (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Wowhead URLs (one per line)</Label>
                      <Textarea
                        placeholder={`https://www.wowhead.com/tbc/item=32837/warglaive-of-azzinoth
https://www.wowhead.com/tbc/item=30110/amani-mask-of-death
https://www.wowhead.com/tbc/item=32471/shard-of-contempt`}
                        value={wowheadUrls}
                        onChange={(e) => setWowheadUrls(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste full Wowhead URLs or just item IDs (e.g., 32837). Item name, quality, and slot will be fetched automatically.
                      </p>
                    </div>
                    {fetchErrors.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm">
                        <p className="font-medium text-red-400 mb-1">Errors:</p>
                        <ul className="space-y-1">
                          {fetchErrors.slice(0, 5).map((err, idx) => (
                            <li key={idx} className="text-xs text-red-300">{err.url}: {err.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsWowheadImportOpen(false)} disabled={isFetchingItems}>
                      Cancel
                    </Button>
                    <Button onClick={handleFetchWowheadItems} disabled={!wowheadUrls.trim() || isFetchingItems}>
                      {isFetchingItems ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-2" />
                      )}
                      {isFetchingItems ? 'Fetching...' : 'Fetch Items'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-2">
                    {fetchedItems.map((item, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg border space-y-3">
                        <div className="flex items-center gap-3">
                          <a
                            href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                          >
                            <img
                              src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                              alt={item.name}
                              className="w-10 h-10 rounded"
                              style={{ borderColor: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4], borderWidth: 2, borderStyle: 'solid' }}
                            />
                          </a>
                          <a
                            href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                            className="font-medium text-sm hover:underline flex-1 truncate"
                            style={{ color: ITEM_QUALITY_COLORS[item.quality] || ITEM_QUALITY_COLORS[4] }}
                          >
                            {item.name}
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => removeFetchedItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Slot</Label>
                            <Select value={item.slot} onValueChange={(v) => updateFetchedItem(index, 'slot', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select slot" /></SelectTrigger>
                              <SelectContent>
                                {GEAR_SLOTS.map((slot) => (
                                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Phase</Label>
                            <Select value={item.phase} onValueChange={(v) => updateFetchedItem(index, 'phase', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select phase" /></SelectTrigger>
                              <SelectContent>
                                {PHASES.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Source</Label>
                            <Select value={item.raid} onValueChange={(v) => updateFetchedItem(index, 'raid', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select source" /></SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Raids</SelectLabel>
                                  {RAIDS.map((r) => (
                                    <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Other Sources</SelectLabel>
                                  {ITEM_SOURCES.filter(s => s !== 'Raid').map((source) => (
                                    <SelectItem key={source} value={source}>{source}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Quality</Label>
                            <Select value={item.quality.toString()} onValueChange={(v) => updateFetchedItem(index, 'quality', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
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
                    ))}
                    {fetchedItems.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No items to import. Go back and add URLs.
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportStage('input')} disabled={isSavingImport}>
                      Back
                    </Button>
                    <Button onClick={handleSaveWowheadItems} disabled={fetchedItems.length === 0 || isSavingImport}>
                      {isSavingImport ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {isSavingImport ? 'Saving...' : `Save ${fetchedItems.length} Items`}
                    </Button>
                  </DialogFooter>
                </>
              )}
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
          <Button variant="outline" onClick={handleFixPhases} disabled={isFixingPhases}>
            {isFixingPhases ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Filter className="h-4 w-4 mr-2" />
            )}
            {isFixingPhases ? 'Fixing...' : 'Fix Phases'}
          </Button>
          <Button variant="outline" onClick={handleSyncBis} disabled={isSyncingBis}>
            {isSyncingBis ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isSyncingBis ? 'Syncing...' : 'Sync BiS'}
          </Button>
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
                  <Label htmlFor="wowheadId">Wowhead Item ID or URL</Label>
                  <Input
                    id="wowheadId"
                    value={newItem.wowheadId}
                    onChange={(e) => setNewItem({ ...newItem, wowheadId: e.target.value })}
                    placeholder="e.g., 32837 or paste Wowhead URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the item ID (32837) or paste the full Wowhead URL
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
                    <Label htmlFor="raid">Source</Label>
                    <Select value={newItem.raid} onValueChange={(value) => setNewItem({ ...newItem, raid: value })}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Raids</SelectLabel>
                          {RAIDS.map((raid) => (
                            <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other Sources</SelectLabel>
                          {ITEM_SOURCES.filter(s => s !== 'Raid').map((source) => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectGroup>
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
                <Button
                  onClick={handleAddItem}
                  disabled={!newItem.wowheadId || !newItem.name || !newItem.slot || !newItem.raid || !newItem.phase || saving}
                >
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
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectGroup>
                  <SelectLabel>Raids</SelectLabel>
                  {RAIDS.map((raid) => (
                    <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Other Sources</SelectLabel>
                  {ITEM_SOURCES.filter(s => s !== 'Raid').map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectGroup>
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
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">BiS: </span>
                            <div className="flex flex-wrap gap-1">
                              {item.bisFor.split(', ').map((spec) => {
                                const color = getSpecShortNameColor(spec);
                                return (
                                  <span
                                    key={spec}
                                    className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ backgroundColor: `${color}20`, color }}
                                  >
                                    {spec}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {item.bisNextPhase && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">BiS Next: </span>
                            <div className="flex flex-wrap gap-1">
                              {item.bisNextPhase.split(', ').map((spec) => {
                                const color = getSpecShortNameColor(spec);
                                return (
                                  <span
                                    key={spec}
                                    className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ backgroundColor: `${color}20`, color }}
                                  >
                                    {spec}
                                  </span>
                                );
                              })}
                            </div>
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
              Edit item details and loot council information.
            </DialogDescription>
          </DialogHeader>

          {loadingItemDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Item Details Section */}
              <div className="space-y-3 pb-3 border-b">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Item Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input
                      placeholder="e.g., Warglaive of Azzinoth"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wowhead ID</Label>
                    <Input
                      placeholder="e.g., 32837"
                      value={editForm.wowheadId}
                      onChange={(e) => setEditForm({ ...editForm, wowheadId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Slot</Label>
                    <Select value={editForm.slot} onValueChange={(value) => setEditForm({ ...editForm, slot: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {GEAR_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phase</Label>
                    <Select value={editForm.phase} onValueChange={(value) => setEditForm({ ...editForm, phase: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASES.map((phase) => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quality</Label>
                    <Select value={editForm.quality} onValueChange={(value) => setEditForm({ ...editForm, quality: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
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

              {/* Source Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Boss</Label>
                  <Input
                    placeholder="e.g., Illidan Stormrage"
                    value={editForm.boss}
                    onChange={(e) => setEditForm({ ...editForm, boss: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={editForm.raid} onValueChange={(value) => setEditForm({ ...editForm, raid: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Raids</SelectLabel>
                        {RAIDS.map((raid) => (
                          <SelectItem key={raid.name} value={raid.name}>{raid.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Other Sources</SelectLabel>
                        {ITEM_SOURCES.filter(s => s !== 'Raid').map((source) => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
