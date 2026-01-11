'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Target, Search, X, ExternalLink, Download, Upload, Copy, Check, Database } from 'lucide-react';
import { CLASS_COLORS, TbcItem, TbcEnchant, TbcGem } from '@hooligans/shared';
import { getSpecIconUrl, getItemIconUrl, refreshWowheadTooltips, SLOT_ICONS, ITEM_QUALITY_COLORS } from '@/lib/wowhead';
import { GearPickerModal } from '@/components/gear-picker-modal';

const WOW_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];

// WoWSims class background images
const SPEC_BACKGROUNDS: Record<string, string> = {
  // Druid
  DruidBalance: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/balance_druid_background.jpg',
  DruidFeral: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/feral_druid_background.jpg',
  DruidGuardian: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/feral_druid_tank_background.jpg',
  DruidRestoration: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/balance_druid_background.jpg',
  // Hunter
  HunterBeastMastery: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  HunterMarksmanship: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  HunterSurvival: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  // Mage
  MageArcane: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  MageFire: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  MageFrost: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  // Paladin
  PaladinHoly: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  PaladinProtection: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  PaladinRetribution: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  // Priest
  PriestDiscipline: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/smite_priest_background.jpg',
  PriestHoly: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/smite_priest_background.jpg',
  PriestShadow: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/shadow_priest_background.jpg',
  // Rogue
  RogueAssassination: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  RogueCombat: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  RogueSubtlety: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  // Shaman
  ShamanElemental: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/elemental_shaman_background.jpg',
  ShamanEnhancement: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/enhancement_shaman_background.jpg',
  ShamanRestoration: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/elemental_shaman_background.jpg',
  // Warlock
  WarlockAffliction: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  WarlockDemonology: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  WarlockDestruction: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  // Warrior
  WarriorArms: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warrior_background.jpg',
  WarriorFury: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warrior_background.jpg',
  WarriorProtection: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/protection_warrior_background.jpg',
};

// Left side slots (icon | text)
const LEFT_SLOTS = [
  { slot: 'Head', label: 'Head' },
  { slot: 'Neck', label: 'Neck' },
  { slot: 'Shoulder', label: 'Shoulders' },
  { slot: 'Back', label: 'Back' },
  { slot: 'Chest', label: 'Chest' },
  { slot: 'Wrist', label: 'Wrists' },
  { slot: 'MainHand', label: 'Main Hand' },
  { slot: 'OffHand', label: 'Off Hand' },
];

// Right side slots (text | icon)
const RIGHT_SLOTS = [
  { slot: 'Hands', label: 'Hands' },
  { slot: 'Waist', label: 'Waist' },
  { slot: 'Legs', label: 'Legs' },
  { slot: 'Feet', label: 'Feet' },
  { slot: 'Finger1', label: 'Ring 1' },
  { slot: 'Finger2', label: 'Ring 2' },
  { slot: 'Trinket1', label: 'Trinket 1' },
  { slot: 'Trinket2', label: 'Trinket 2' },
  { slot: 'Ranged', label: 'Ranged' },
];

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
  role: string;
  roleSubtype: string;
};

type Item = {
  id: string;
  name: string;
  wowheadId: number | null;
  icon: string | null;
  quality: number;
  raid: string;
  boss: string;
  slot: string;
};

type BisConfig = {
  slot: string;
  itemName: string;
  wowheadId: number | null;
  source: string | null;
  item: Item | null;
};

type PlayerGear = {
  id: string;
  slot: string;
  itemId: string | null;
  item: Item | null;
  wowheadId: number | null;
  itemName: string | null;
  icon: string | null;
};

type DialogContext = 'current' | 'bis';

export default function BisListsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [bisConfig, setBisConfig] = useState<BisConfig[]>([]);
  const [currentGear, setCurrentGear] = useState<PlayerGear[]>([]);
  const [currentPhase] = useState<string>('P1');

  // Item selection dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<DialogContext>('bis');
  const [selectedSlot, setSelectedSlot] = useState<{ slot: string; label: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Import/Export dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<'current' | 'bis'>('current');
  const [importJson, setImportJson] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // TBC Gear Picker Modal state
  const [tbcPickerOpen, setTbcPickerOpen] = useState(false);
  const [useTbcPicker, setUseTbcPicker] = useState(true); // Toggle between DB search and TBC picker

  useEffect(() => {
    fetchPlayers();
  }, []);

  const selectedPlayerData = players.find(p => p.name === selectedPlayer);

  // Update selectedPlayerId when player changes
  useEffect(() => {
    if (selectedPlayerData) {
      setSelectedPlayerId(selectedPlayerData.id);
    }
  }, [selectedPlayerData]);

  // Fetch BiS config when player changes
  const fetchBisConfig = useCallback(async (spec: string) => {
    try {
      const res = await fetch(`/api/bis?spec=${encodeURIComponent(spec)}&phase=${currentPhase}`);
      if (res.ok) {
        const data = await res.json();
        setBisConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch BiS config:', error);
    }
  }, [currentPhase]);

  // Fetch current gear when player changes
  const fetchCurrentGear = useCallback(async (playerId: string) => {
    try {
      const res = await fetch(`/api/players/${playerId}/gear`);
      if (res.ok) {
        const data = await res.json();
        setCurrentGear(data);
      }
    } catch (error) {
      console.error('Failed to fetch current gear:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedPlayerData?.mainSpec) {
      fetchBisConfig(selectedPlayerData.mainSpec);
    }
    if (selectedPlayerId) {
      fetchCurrentGear(selectedPlayerId);
    }
  }, [selectedPlayerData?.mainSpec, selectedPlayerId, fetchBisConfig, fetchCurrentGear]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedPlayer, bisConfig, currentGear]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
        if (data.length > 0) {
          setSelectedPlayer(data[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    return classFilter === 'all' || player.class === classFilter;
  });

  // Search items when query changes
  useEffect(() => {
    const searchItems = async () => {
      if (!selectedSlot) return;

      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('slot', selectedSlot.slot);
        if (searchQuery) {
          params.set('q', searchQuery);
        }
        params.set('limit', '30');

        const res = await fetch(`/api/items/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Failed to search items:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedSlot]);

  // Get BiS item for a slot
  const getBisItem = (slot: string): BisConfig | null => {
    return bisConfig.find(b => b.slot === slot) || null;
  };

  // Get current gear for a slot
  const getCurrentGearItem = (slot: string): PlayerGear | null => {
    return currentGear.find(g => g.slot === slot) || null;
  };

  // Handle slot click - opens dialog with context
  const handleSlotClick = (slot: string, label: string, context: DialogContext) => {
    setSelectedSlot({ slot, label });
    setDialogContext(context);
    setSearchQuery('');
    setSearchResults([]);
    if (useTbcPicker) {
      setTbcPickerOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  // Handle TBC item selection from the gear picker modal
  const handleTbcItemSelect = async (item: TbcItem) => {
    if (!selectedSlot) return;

    try {
      if (dialogContext === 'bis') {
        if (!selectedPlayerData?.mainSpec) return;

        // For BiS, we just store the item reference
        const res = await fetch('/api/bis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spec: selectedPlayerData.mainSpec,
            phase: currentPhase,
            slot: selectedSlot.slot,
            wowheadId: item.id,
            itemName: item.name,
          }),
        });

        if (res.ok) {
          await fetchBisConfig(selectedPlayerData.mainSpec);
        }
      } else {
        // Update current gear
        const res = await fetch(`/api/players/${selectedPlayerId}/gear`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: selectedSlot.slot,
            wowheadId: item.id,
            itemName: item.name,
          }),
        });

        if (res.ok) {
          await fetchCurrentGear(selectedPlayerId);
        }
      }
    } catch (error) {
      console.error('Failed to save TBC item selection:', error);
    }
  };

  // Handle TBC enchant selection
  const handleTbcEnchantSelect = async (enchant: TbcEnchant) => {
    if (!selectedSlot || !selectedPlayerId) return;

    try {
      // Update current gear with enchant
      const currentSlotGear = getCurrentGearItem(selectedSlot.slot);
      if (currentSlotGear) {
        const res = await fetch(`/api/players/${selectedPlayerId}/gear`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: selectedSlot.slot,
            wowheadId: currentSlotGear.wowheadId || currentSlotGear.item?.wowheadId,
            itemName: currentSlotGear.itemName || currentSlotGear.item?.name,
            enchantId: enchant.id,
          }),
        });

        if (res.ok) {
          await fetchCurrentGear(selectedPlayerId);
        }
      }
    } catch (error) {
      console.error('Failed to save TBC enchant selection:', error);
    }
  };

  // Handle TBC gem selection
  const handleTbcGemSelect = async (gem: TbcGem, socketIndex: number) => {
    if (!selectedSlot || !selectedPlayerId) return;

    try {
      const currentSlotGear = getCurrentGearItem(selectedSlot.slot);
      if (currentSlotGear) {
        const gemUpdates: Record<string, number | null> = {};
        if (socketIndex === 0) gemUpdates.gem1Id = gem.id;
        else if (socketIndex === 1) gemUpdates.gem2Id = gem.id;
        else if (socketIndex === 2) gemUpdates.gem3Id = gem.id;

        const res = await fetch(`/api/players/${selectedPlayerId}/gear`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: selectedSlot.slot,
            wowheadId: currentSlotGear.wowheadId || currentSlotGear.item?.wowheadId,
            itemName: currentSlotGear.itemName || currentSlotGear.item?.name,
            ...gemUpdates,
          }),
        });

        if (res.ok) {
          await fetchCurrentGear(selectedPlayerId);
        }
      }
    } catch (error) {
      console.error('Failed to save TBC gem selection:', error);
    }
  };

  // Handle clear from TBC picker
  const handleTbcClear = async () => {
    if (!selectedSlot) return;
    await handleClearSlot();
    setTbcPickerOpen(false);
  };

  // Handle item selection
  const handleSelectItem = async (item: Item) => {
    if (!selectedSlot) return;

    try {
      if (dialogContext === 'bis') {
        if (!selectedPlayerData?.mainSpec) return;

        const res = await fetch('/api/bis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spec: selectedPlayerData.mainSpec,
            phase: currentPhase,
            slot: selectedSlot.slot,
            itemId: item.id,
          }),
        });

        if (res.ok) {
          await fetchBisConfig(selectedPlayerData.mainSpec);
        }
      } else {
        // Update current gear
        const res = await fetch(`/api/players/${selectedPlayerId}/gear`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: selectedSlot.slot,
            itemId: item.id,
            wowheadId: item.wowheadId,
            itemName: item.name,
            icon: item.icon,
          }),
        });

        if (res.ok) {
          await fetchCurrentGear(selectedPlayerId);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save selection:', error);
    }
  };

  // Handle clear slot
  const handleClearSlot = async () => {
    if (!selectedSlot) return;

    try {
      if (dialogContext === 'bis') {
        if (!selectedPlayerData?.mainSpec) return;

        const params = new URLSearchParams();
        params.set('spec', selectedPlayerData.mainSpec);
        params.set('phase', currentPhase);
        params.set('slot', selectedSlot.slot);

        const res = await fetch(`/api/bis?${params}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchBisConfig(selectedPlayerData.mainSpec);
        }
      } else {
        const res = await fetch(`/api/players/${selectedPlayerId}/gear?slot=${selectedSlot.slot}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchCurrentGear(selectedPlayerId);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to clear slot:', error);
    }
  };

  // Export to WoWSims - maps specs to wowsims.com URL paths
  const handleExportToWowSims = (gearType: 'current' | 'bis') => {
    if (!selectedPlayerData) return;

    const specMap: Record<string, string> = {
      // Druid
      'DruidBalance': 'balance_druid',
      'DruidFeral': 'feral_druid',
      'DruidGuardian': 'feral_tank_druid',
      'DruidRestoration': 'balance_druid', // No resto sim, use balance
      // Hunter (all specs use same sim)
      'HunterBeastMastery': 'hunter',
      'HunterMarksmanship': 'hunter',
      'HunterSurvival': 'hunter',
      // Mage (all specs use same sim)
      'MageArcane': 'mage',
      'MageFire': 'mage',
      'MageFrost': 'mage',
      // Paladin
      'PaladinRetribution': 'retribution_paladin',
      'PaladinProtection': 'protection_paladin',
      'PaladinHoly': 'retribution_paladin', // No holy sim
      // Priest
      'PriestShadow': 'shadow_priest',
      'PriestDiscipline': 'smite_priest',
      'PriestHoly': 'smite_priest',
      // Rogue (all specs use same sim)
      'RogueCombat': 'rogue',
      'RogueAssassination': 'rogue',
      'RogueSubtlety': 'rogue',
      // Shaman
      'ShamanElemental': 'elemental_shaman',
      'ShamanEnhancement': 'enhancement_shaman',
      'ShamanRestoration': 'elemental_shaman', // No resto sim
      // Warlock (all specs use same sim)
      'WarlockAffliction': 'warlock',
      'WarlockDemonology': 'warlock',
      'WarlockDestruction': 'warlock',
      // Warrior
      'WarriorArms': 'warrior',
      'WarriorFury': 'warrior',
      'WarriorProtection': 'protection_warrior',
    };

    const specPath = specMap[selectedPlayerData.mainSpec] || 'hunter';
    const wowsimsUrl = `https://wowsims.com/tbc/${specPath}/`;

    window.open(wowsimsUrl, '_blank');
  };

  // Export gear as JSON
  const handleExportJson = (gearType: 'current' | 'bis') => {
    if (!selectedPlayerData) return;

    const gear = gearType === 'current' ? currentGear : bisConfig;
    const allSlots = [...LEFT_SLOTS, ...RIGHT_SLOTS];

    const exportData = {
      player: selectedPlayerData.name,
      class: selectedPlayerData.class,
      spec: selectedPlayerData.mainSpec,
      gearType,
      gear: allSlots.map(({ slot }) => {
        if (gearType === 'current') {
          const item = currentGear.find(g => g.slot === slot);
          return {
            slot,
            wowheadId: item?.wowheadId || item?.item?.wowheadId || null,
            name: item?.itemName || item?.item?.name || null,
            icon: item?.icon || item?.item?.icon || null,
          };
        } else {
          const item = bisConfig.find(b => b.slot === slot);
          return {
            slot,
            wowheadId: item?.wowheadId || item?.item?.wowheadId || null,
            name: item?.itemName || item?.item?.name || null,
            icon: item?.item?.icon || null,
          };
        }
      }).filter(g => g.wowheadId),
    };

    const json = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open import dialog
  const handleOpenImport = (target: 'current' | 'bis') => {
    setImportTarget(target);
    setImportJson('');
    setImportDialogOpen(true);
  };

  // Map WoWSims slot names to our slot names
  const mapWowSimsSlot = (slot: string): string | null => {
    const slotMap: Record<string, string> = {
      'head': 'Head',
      'neck': 'Neck',
      'shoulder': 'Shoulder',
      'back': 'Back',
      'chest': 'Chest',
      'wrist': 'Wrist',
      'hands': 'Hands',
      'waist': 'Waist',
      'legs': 'Legs',
      'feet': 'Feet',
      'finger1': 'Finger1',
      'finger2': 'Finger2',
      'trinket1': 'Trinket1',
      'trinket2': 'Trinket2',
      'mainHand': 'MainHand',
      'offHand': 'OffHand',
      'ranged': 'Ranged',
    };
    return slotMap[slot] || slot;
  };

  // Import gear from JSON (supports our format and WoWSims addon format)
  const handleImportJson = async () => {
    if (!selectedPlayerId || !importJson) return;

    setImportLoading(true);
    try {
      const data = JSON.parse(importJson);
      let gearItems: Array<{ slot: string; wowheadId: number; name?: string; icon?: string }> = [];

      // Check for WoWSims addon format (has "equipment" object with slot keys)
      if (data.equipment && typeof data.equipment === 'object') {
        // WoWSims addon format: { equipment: { head: { id: 123 }, neck: { id: 456 }, ... } }
        for (const [slotKey, itemData] of Object.entries(data.equipment)) {
          const item = itemData as { id?: number; enchant?: number; gems?: number[] };
          if (item && item.id) {
            const mappedSlot = mapWowSimsSlot(slotKey);
            if (mappedSlot) {
              gearItems.push({
                slot: mappedSlot,
                wowheadId: item.id,
              });
            }
          }
        }
      } else if (data.gear && Array.isArray(data.gear)) {
        // Our format: { gear: [{ slot: "Head", wowheadId: 123, name: "Item" }, ...] }
        gearItems = data.gear;
      } else if (Array.isArray(data)) {
        // Simple array format
        gearItems = data;
      }

      let importedCount = 0;
      for (const item of gearItems) {
        if (!item.wowheadId) continue;

        const slot = item.slot;
        if (!slot) continue;

        if (importTarget === 'current') {
          await fetch(`/api/players/${selectedPlayerId}/gear`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slot,
              wowheadId: item.wowheadId,
              itemName: item.name || `Item ${item.wowheadId}`,
              icon: item.icon,
            }),
          });
          importedCount++;
        }
      }

      // Refresh data
      if (importTarget === 'current') {
        await fetchCurrentGear(selectedPlayerId);
      }

      setImportDialogOpen(false);
      setImportJson('');
      alert(`Imported ${importedCount} items successfully!`);
    } catch (error) {
      console.error('Failed to import:', error);
      alert('Failed to import. Please check the JSON format.');
    } finally {
      setImportLoading(false);
    }
  };

  // Calculate BiS completion percentage
  const calculateBisCompletion = () => {
    if (bisConfig.length === 0) return 0;

    let matches = 0;
    for (const bis of bisConfig) {
      if (!bis.item) continue;
      const current = getCurrentGearItem(bis.slot);
      if (current?.item?.id === bis.item.id || current?.wowheadId === bis.item.wowheadId) {
        matches++;
      }
    }

    return Math.round((matches / bisConfig.length) * 100);
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
            <h1 className="text-2xl font-bold text-foreground">Gear Comparison</h1>
            <p className="text-muted-foreground">Compare current gear vs BiS</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add players to your roster first to track their gear progress.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderGearSlot = (slot: string, label: string, context: DialogContext, align: 'left' | 'right') => {
    const gearItem = context === 'current' ? getCurrentGearItem(slot) : getBisItem(slot);
    const item = context === 'current'
      ? (gearItem as PlayerGear | null)?.item
      : (gearItem as BisConfig | null)?.item;
    const wowheadId = item?.wowheadId || (context === 'current' ? (gearItem as PlayerGear | null)?.wowheadId : null);
    const itemName = item?.name || (context === 'current' ? (gearItem as PlayerGear | null)?.itemName : null);
    const icon = item?.icon || (context === 'current' ? (gearItem as PlayerGear | null)?.icon : null);
    const slotIcon = SLOT_ICONS[slot] || 'inv_misc_questionmark';
    const hasItem = !!wowheadId || !!item;

    const iconElement = hasItem && wowheadId ? (
      <a
        href={`https://www.wowhead.com/tbc/item=${wowheadId}`}
        onClick={(e) => e.preventDefault()}
        className="relative block flex-shrink-0"
      >
        <img
          src={getItemIconUrl(icon || 'inv_misc_questionmark', 'medium')}
          alt={itemName || label}
          className="w-8 h-8 rounded"
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: item ? (ITEM_QUALITY_COLORS[item.quality] || '#a335ee') : '#a335ee',
          }}
        />
      </a>
    ) : (
      <div className="relative flex-shrink-0">
        <img
          src={getItemIconUrl(slotIcon, 'medium')}
          alt={label}
          className="w-8 h-8 rounded"
          style={{
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: '#333',
            opacity: 0.4,
          }}
        />
      </div>
    );

    const textElement = (
      <div className={`flex-1 min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
        {hasItem ? (
          <span
            className="text-xs font-medium block truncate"
            style={{ color: item ? (ITEM_QUALITY_COLORS[item.quality] || '#a335ee') : '#a335ee' }}
          >
            {itemName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
      </div>
    );

    return (
      <div
        key={`${context}-${slot}`}
        onClick={() => handleSlotClick(slot, label, context)}
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
      >
        {align === 'left' ? (
          <>
            {iconElement}
            {textElement}
          </>
        ) : (
          <>
            {textElement}
            {iconElement}
          </>
        )}
      </div>
    );
  };

  const bisCompletion = calculateBisCompletion();
  const backgroundUrl = selectedPlayerData?.mainSpec ? SPEC_BACKGROUNDS[selectedPlayerData.mainSpec] : null;

  return (
    <div
      className="space-y-6 min-h-screen -m-6 p-6 transition-all duration-500"
      style={{
        backgroundImage: backgroundUrl ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gear Comparison</h1>
          <p className="text-muted-foreground">Compare current gear vs BiS</p>
        </div>
        {selectedPlayerData && (
          <div className="flex gap-2">
            <Button
              variant={useTbcPicker ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseTbcPicker(!useTbcPicker)}
              title={useTbcPicker ? 'Using TBC Item Database (4500+ items)' : 'Using Boss Loot Tables'}
            >
              <Database className="h-4 w-4 mr-2" />
              {useTbcPicker ? 'TBC DB' : 'Loot Tables'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportToWowSims('current')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Sim Current
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportToWowSims('bis')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Sim BiS
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Player List Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Characters</CardTitle>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {WOW_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    <span style={{ color: CLASS_COLORS[cls] }}>{cls}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[700px] overflow-y-auto">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player.name)}
                className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-3 ${
                  selectedPlayer === player.name
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <img
                  src={getSpecIconUrl(player.mainSpec)}
                  alt={player.mainSpec}
                  className="w-8 h-8 rounded"
                  style={{ borderColor: CLASS_COLORS[player.class], borderWidth: 2 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span style={{ color: CLASS_COLORS[player.class] }} className="font-medium truncate">
                      {player.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.mainSpec?.replace(player.class, '')}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Character Header */}
          {selectedPlayerData && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <img
                    src={getSpecIconUrl(selectedPlayerData.mainSpec)}
                    alt={selectedPlayerData.mainSpec}
                    className="w-14 h-14 rounded-lg"
                    style={{ borderColor: CLASS_COLORS[selectedPlayerData.class], borderWidth: 3 }}
                  />
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: CLASS_COLORS[selectedPlayerData.class] }}>
                      {selectedPlayer}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlayerData.mainSpec?.replace(selectedPlayerData.class, '')} {selectedPlayerData.class}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold" style={{ color: bisCompletion === 100 ? '#1eff00' : bisCompletion > 50 ? '#ffcc00' : '#ff6b6b' }}>
                      {bisCompletion}%
                    </div>
                    <p className="text-xs text-muted-foreground">BiS Complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Side-by-Side Gear Comparison */}
          {selectedPlayerData && (
            <div className="grid grid-cols-2 gap-4">
              {/* BiS List Panel */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      BiS List
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportJson('bis')}>
                          <Download className="h-4 w-4 mr-2" />
                          Export JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenImport('bis')}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Left side slots */}
                    <div className="space-y-0.5">
                      {LEFT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'bis', 'left'))}
                    </div>
                    {/* Right side slots */}
                    <div className="space-y-0.5">
                      {RIGHT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'bis', 'right'))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Gear Panel */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Current Gear
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportJson('current')}>
                          <Download className="h-4 w-4 mr-2" />
                          Export JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenImport('current')}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Left side slots */}
                    <div className="space-y-0.5">
                      {LEFT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'current', 'left'))}
                    </div>
                    {/* Right side slots */}
                    <div className="space-y-0.5">
                      {RIGHT_SLOTS.map(({ slot, label }) => renderGearSlot(slot, label, 'current', 'right'))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Item Selection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Select {dialogContext === 'current' ? 'Current' : 'BiS'}: {selectedSlot?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {((dialogContext === 'bis' && getBisItem(selectedSlot?.slot || '')) ||
              (dialogContext === 'current' && getCurrentGearItem(selectedSlot?.slot || ''))) && (
              <Button variant="outline" size="sm" onClick={handleClearSlot}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectItem(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectItem(item);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
                  >
                    <img
                      src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'medium')}
                      alt={item.name}
                      className="w-9 h-9 rounded pointer-events-none"
                      style={{
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: ITEM_QUALITY_COLORS[item.quality] || '#a335ee'
                      }}
                    />
                    <div className="flex-1 min-w-0 pointer-events-none">
                      <div
                        className="font-medium truncate"
                        style={{ color: ITEM_QUALITY_COLORS[item.quality] || '#a335ee' }}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.raid} - {item.boss}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {searchQuery ? 'No items found' : 'Type to search for items or browse available items'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Import {importTarget === 'current' ? 'Current Gear' : 'BiS List'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paste JSON</Label>
              <Textarea
                placeholder='{"gear": [{"slot": "Head", "wowheadId": 12345, "name": "Item Name"}, ...]}'
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports: This app export, WoWSims Exporter addon JSON
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportJson} disabled={!importJson || importLoading}>
              {importLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TBC Gear Picker Modal */}
      <GearPickerModal
        open={tbcPickerOpen}
        onOpenChange={setTbcPickerOpen}
        slot={selectedSlot?.slot || ''}
        slotLabel={selectedSlot?.label || ''}
        onSelectItem={handleTbcItemSelect}
        onSelectEnchant={handleTbcEnchantSelect}
        onSelectGem={handleTbcGemSelect}
        onClear={handleTbcClear}
        currentItem={
          dialogContext === 'current'
            ? getCurrentGearItem(selectedSlot?.slot || '')
              ? { id: getCurrentGearItem(selectedSlot?.slot || '')?.wowheadId || 0, name: getCurrentGearItem(selectedSlot?.slot || '')?.itemName || '' }
              : null
            : getBisItem(selectedSlot?.slot || '')
              ? { id: getBisItem(selectedSlot?.slot || '')?.wowheadId || 0, name: getBisItem(selectedSlot?.slot || '')?.itemName || '' }
              : null
        }
        playerClass={selectedPlayerData?.class}
      />
    </div>
  );
}
