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
import { Plus, Search, Filter, Package, Database, Sword, Upload, ExternalLink } from 'lucide-react';
import { RAIDS, GEAR_SLOTS } from '@hooligans/shared';
import { getItemIconUrl, refreshWowheadTooltips, TBC_RAIDS } from '@/lib/wowhead';

const mockItems = [
  { id: '1', name: 'Sunfire Robe', slot: 'Chest', raid: 'Sunwell Plateau', boss: 'Kalecgos', phase: 'P5', wowheadId: 34364, icon: 'inv_chest_cloth_43', bisSpecs: ['DruidBalance', 'MageArcane', 'MageFire', 'WarlockDestruction'] },
  { id: '2', name: 'Blade of Harbingers', slot: 'MainHand', raid: 'Sunwell Plateau', boss: 'Felmyst', phase: 'P5', wowheadId: 34331, icon: 'inv_sword_113', bisSpecs: ['RogueCombat', 'WarriorFury'] },
  { id: '3', name: 'Legguards of Endless Rage', slot: 'Legs', raid: 'Sunwell Plateau', boss: 'Brutallus', phase: 'P5', wowheadId: 34180, icon: 'inv_pants_plate_24', bisSpecs: ['WarriorFury', 'PaladinRetribution'] },
  { id: '4', name: 'Ring of Flowing Life', slot: 'Finger', raid: 'Black Temple', boss: 'Mother Shahraz', phase: 'P3', wowheadId: 32528, icon: 'inv_jewelry_ring_55', bisSpecs: ['PaladinHoly', 'DruidRestoration'] },
  { id: '5', name: 'Pillar of Ferocity', slot: 'TwoHand', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 32332, icon: 'inv_staff_54', bisSpecs: ['DruidFeral'] },
  { id: '6', name: 'Shroud of the Final Stand', slot: 'Back', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 32331, icon: 'inv_misc_cape_naxxramas_01', bisSpecs: ['PaladinProtection', 'WarriorProtection'] },
  { id: '7', name: 'Stanchion of Primal Instinct', slot: 'MainHand', raid: 'Black Temple', boss: 'Reliquary of Souls', phase: 'P3', wowheadId: 32500, icon: 'inv_weapon_shortblade_62', bisSpecs: ['HunterBeastMastery', 'HunterSurvival'] },
  { id: '8', name: 'Warglaive of Azzinoth (MH)', slot: 'MainHand', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 32837, icon: 'inv_weapon_glave_01', bisSpecs: ['RogueCombat', 'WarriorFury'] },
  { id: '9', name: 'Warglaive of Azzinoth (OH)', slot: 'OffHand', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 32838, icon: 'inv_weapon_glave_01', bisSpecs: ['RogueCombat', 'WarriorFury'] },
  { id: '10', name: 'Gronnstalker Helmet', slot: 'Head', raid: 'Hyjal Summit', boss: 'Archimonde', phase: 'P3', wowheadId: 31003, icon: 'inv_helmet_96', bisSpecs: ['HunterBeastMastery', 'HunterMarksmanship', 'HunterSurvival'] },
  { id: '11', name: 'Thunderheart Chestguard', slot: 'Chest', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 31042, icon: 'inv_chest_leather_20', bisSpecs: ['DruidFeral', 'DruidGuardian'] },
  { id: '12', name: 'Lightbringer Chestguard', slot: 'Chest', raid: 'Black Temple', boss: 'Illidan Stormrage', phase: 'P3', wowheadId: 30991, icon: 'inv_chest_plate20', bisSpecs: ['PaladinProtection'] },
];

const PHASES = ['P1', 'P2', 'P3', 'P4', 'P5'];

export default function ItemsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [raidFilter, setRaidFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importZone, setImportZone] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    slot: '',
    raid: '',
    boss: '',
    phase: '',
    wowheadId: '',
  });

  useEffect(() => {
    refreshWowheadTooltips();
  }, []);

  const filteredItems = mockItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRaid = raidFilter === 'all' || item.raid === raidFilter;
    const matchesSlot = slotFilter === 'all' || item.slot === slotFilter;
    const matchesPhase = phaseFilter === 'all' || item.phase === phaseFilter;
    return matchesSearch && matchesRaid && matchesSlot && matchesPhase;
  });

  const formatSpec = (spec: string) => {
    return spec.replace(/([A-Z])/g, ' $1').trim();
  };

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
                  <Label>Select Raid Zone</Label>
                  <Select value={importZone} onValueChange={setImportZone}>
                    <SelectTrigger><SelectValue placeholder="Select zone to import" /></SelectTrigger>
                    <SelectContent>
                      {TBC_RAIDS.map((raid) => (
                        <SelectItem key={raid.id} value={raid.id}>
                          {raid.name} ({raid.phase})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will fetch all items from the selected zone and add them to the database.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                <Button disabled={!importZone}>
                  <Upload className="h-4 w-4 mr-2" />Import Items
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button disabled={!newItem.wowheadId}>Add Item</Button>
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
            <div className="text-2xl font-bold">{mockItems.length}</div>
            <p className="text-xs text-muted-foreground">items in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BiS Items</CardTitle>
            <Sword className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {mockItems.filter(i => i.bisSpecs.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">items marked as BiS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raids Covered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(mockItems.map(i => i.raid)).size}</div>
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
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {mockItems.length} items
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:border-purple-500/50 transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <a
                  href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                >
                  <img
                    src={getItemIconUrl(item.icon, 'large')}
                    alt={item.name}
                    className="w-12 h-12 rounded border-2 border-purple-500"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                    className="font-semibold text-purple-400 hover:underline truncate block"
                  >
                    {item.name}
                  </a>
                  <p className="text-sm text-muted-foreground">{item.slot}</p>
                  <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-muted mt-1">{item.phase}</span>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {item.raid} - {item.boss}
              </div>
              {item.bisSpecs.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {item.bisSpecs.slice(0, 2).map((spec) => (
                      <span key={spec} className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                        {formatSpec(spec)}
                      </span>
                    ))}
                    {item.bisSpecs.length > 2 && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                        +{item.bisSpecs.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
