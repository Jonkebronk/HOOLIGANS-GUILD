'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Plus, Sword, Wand2, Loader2, X, Pencil } from 'lucide-react';
import { refreshWowheadTooltips, getItemIconUrl } from '@/lib/wowhead';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';
import {
  CONSUMABLE_ROLES,
  CONSUMABLE_CATEGORIES,
  CONSUMABLE_TYPES,
  SPEC_DISPLAY_NAMES,
  getClassFromSpec,
  getConsumablesForSpecCategory,
  type ConsumableType,
} from '@/lib/consumables';

// Role icons mapping
const ROLE_ICONS = {
  Shield: Shield,
  Plus: Plus,
  Sword: Sword,
  Wand2: Wand2,
};

export default function ConsumablesPage() {
  const [consumables, setConsumables] = useState<ConsumableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState<ConsumableType | null>(null);

  // Add consumable form state
  const [newWowheadId, setNewWowheadId] = useState('');
  const [newType, setNewType] = useState('');
  const [addingConsumable, setAddingConsumable] = useState(false);

  // Assign form state
  const [assignSpec, setAssignSpec] = useState('');
  const [assignCategory, setAssignCategory] = useState('');
  const [assignPriority, setAssignPriority] = useState<'best' | 'alternative'>('best');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchConsumables();
  }, []);

  useEffect(() => {
    if (!loading) {
      refreshWowheadTooltips();
    }
  }, [loading, consumables]);

  const fetchConsumables = async () => {
    try {
      const res = await fetch('/api/consumables');
      if (res.ok) {
        const data = await res.json();
        setConsumables(data);
      }
    } catch (error) {
      console.error('Failed to fetch consumables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConsumable = async () => {
    if (!newWowheadId || !newType) return;

    setAddingConsumable(true);
    try {
      const res = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wowheadId: parseInt(newWowheadId),
          type: newType,
        }),
      });

      if (res.ok) {
        const newConsumable = await res.json();
        setConsumables([...consumables, { ...newConsumable, specConfigs: [] }]);
        setNewWowheadId('');
        setNewType('');
        setIsAddDialogOpen(false);
        // Open assign dialog for the new consumable
        setSelectedConsumable({ ...newConsumable, specConfigs: [] });
        setIsAssignDialogOpen(true);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add consumable');
      }
    } catch (error) {
      console.error('Failed to add consumable:', error);
    } finally {
      setAddingConsumable(false);
    }
  };

  const handleDeleteConsumable = async (id: string) => {
    if (!confirm('Delete this consumable? This will remove it from all specs.')) return;

    try {
      const res = await fetch(`/api/consumables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConsumables(consumables.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete consumable:', error);
    }
  };

  const handleAssignConsumable = async () => {
    if (!selectedConsumable || !assignSpec || !assignCategory) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/consumables/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumableId: selectedConsumable.id,
          spec: assignSpec,
          category: assignCategory,
          priority: assignPriority,
        }),
      });

      if (res.ok) {
        // Refresh consumables to get updated configs
        await fetchConsumables();
        setIsAssignDialogOpen(false);
        setSelectedConsumable(null);
        setAssignSpec('');
        setAssignCategory('');
        setAssignPriority('best');
      }
    } catch (error) {
      console.error('Failed to assign consumable:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveFromSpec = async (consumableId: string, spec: string, category: string) => {
    try {
      const res = await fetch(
        `/api/consumables/config?consumableId=${consumableId}&spec=${spec}&category=${category}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        await fetchConsumables();
      }
    } catch (error) {
      console.error('Failed to remove consumable from spec:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen -m-6 p-6 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Required Consumables</h1>
          <p className="text-muted-foreground">
            Recommended consumables by role and spec for raids
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={editMode ? 'default' : 'outline'}
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editMode ? 'Done Editing' : 'Edit'}
          </Button>
          {editMode && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Consumable
            </Button>
          )}
        </div>
      </div>

      {/* Role Sections */}
      {Object.entries(CONSUMABLE_ROLES).map(([roleId, role]) => {
        const RoleIcon = ROLE_ICONS[role.icon as keyof typeof ROLE_ICONS];
        return (
          <Card key={roleId} className="bg-[#111] border-[#333]">
            <CardHeader
              className="py-3"
              style={{ backgroundColor: role.color + '20', borderBottom: `2px solid ${role.color}` }}
            >
              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: role.color }}>
                {RoleIcon && <RoleIcon className="h-5 w-5" />}
                {role.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {role.specs.map((specId) => {
                  const specName = SPEC_DISPLAY_NAMES[specId] || specId;
                  const specClass = getClassFromSpec(specId);
                  const classColor = CLASS_COLORS[specClass] || '#888';

                  return (
                    <div
                      key={specId}
                      className="flex-shrink-0 min-w-[200px] border border-[#333] rounded-lg overflow-hidden"
                    >
                      {/* Spec Header */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 border-b border-[#333]"
                        style={{ backgroundColor: classColor + '30' }}
                      >
                        <img
                          src={getSpecIconUrl(specId, specClass)}
                          alt={specName}
                          className="w-6 h-6 rounded"
                        />
                        <span className="font-medium text-sm" style={{ color: classColor }}>
                          {specName}
                        </span>
                      </div>

                      {/* Categories */}
                      <div className="p-2 space-y-3 bg-[#0d0d0d]">
                        {CONSUMABLE_CATEGORIES.map((cat) => {
                          const bestItems = getConsumablesForSpecCategory(
                            consumables,
                            specId,
                            cat.id,
                            'best'
                          );
                          const altItems = getConsumablesForSpecCategory(
                            consumables,
                            specId,
                            cat.id,
                            'alternative'
                          );

                          if (!editMode && bestItems.length === 0 && altItems.length === 0) {
                            return null;
                          }

                          return (
                            <div key={cat.id}>
                              <div
                                className="text-xs font-semibold px-2 py-1 rounded mb-1"
                                style={{ backgroundColor: '#8b0000', color: '#ffd700' }}
                              >
                                {cat.name}:
                              </div>
                              {/* Best items */}
                              {bestItems.length > 0 && (
                                <div className="mb-1">
                                  <span className="text-[10px] text-gray-500 px-1">Best:</span>
                                  {bestItems.map((item) => (
                                    <ConsumableItem
                                      key={item.id}
                                      consumable={item}
                                      editMode={editMode}
                                      onRemove={() => handleRemoveFromSpec(item.id, specId, cat.id)}
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Alternative items */}
                              {altItems.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-500 px-1">Alternatives:</span>
                                  {altItems.map((item) => (
                                    <ConsumableItem
                                      key={item.id}
                                      consumable={item}
                                      editMode={editMode}
                                      onRemove={() => handleRemoveFromSpec(item.id, specId, cat.id)}
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Add button in edit mode */}
                              {editMode && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-6 text-xs text-muted-foreground hover:text-foreground mt-1"
                                  onClick={() => {
                                    setAssignSpec(specId);
                                    setAssignCategory(cat.id);
                                    setSelectedConsumable(null);
                                    setIsAssignDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Unassigned Consumables Section (Edit Mode) */}
      {editMode && (
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="py-3">
            <CardTitle className="text-lg text-muted-foreground">
              Unassigned Consumables ({consumables.filter((c) => c.specConfigs.length === 0).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {consumables
                .filter((c) => c.specConfigs.length === 0)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-[#1a1a1a] rounded px-2 py-1 border border-[#333]"
                  >
                    <a
                      href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                      className="flex items-center gap-2"
                    >
                      <img
                        src={getItemIconUrl(item.icon || 'inv_misc_questionmark', 'small')}
                        alt={item.name}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-xs text-green-400">{item.name}</span>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-primary/20"
                      onClick={() => {
                        setSelectedConsumable(item);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-destructive/20 text-destructive"
                      onClick={() => handleDeleteConsumable(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              {consumables.filter((c) => c.specConfigs.length === 0).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All consumables are assigned to specs.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Consumable Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Consumable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Wowhead Item ID</Label>
              <Input
                type="number"
                placeholder="e.g., 22851 (Flask of Fortification)"
                value={newWowheadId}
                onChange={(e) => setNewWowheadId(e.target.value)}
                className="bg-[#111] border-gray-600"
              />
              <p className="text-xs text-muted-foreground">
                Find the ID in the Wowhead URL: wowhead.com/tbc/item=<strong>22851</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-[#111] border-gray-600">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMABLE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddConsumable} disabled={!newWowheadId || !newType || addingConsumable}>
              {addingConsumable && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Consumable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Consumable Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedConsumable ? `Assign: ${selectedConsumable.name}` : 'Assign Consumable'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedConsumable && (
              <div className="space-y-2">
                <Label>Select Consumable</Label>
                <Select
                  value=""
                  onValueChange={(id) => setSelectedConsumable(consumables.find((c) => c.id === id) || null)}
                >
                  <SelectTrigger className="bg-[#111] border-gray-600">
                    <SelectValue placeholder="Select consumable" />
                  </SelectTrigger>
                  <SelectContent>
                    {consumables.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Spec</Label>
              <Select value={assignSpec} onValueChange={setAssignSpec}>
                <SelectTrigger className="bg-[#111] border-gray-600">
                  <SelectValue placeholder="Select spec" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONSUMABLE_ROLES).map(([roleId, role]) => (
                    <div key={roleId}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {role.name}
                      </div>
                      {role.specs.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {SPEC_DISPLAY_NAMES[spec]} ({getClassFromSpec(spec)})
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={assignCategory} onValueChange={setAssignCategory}>
                <SelectTrigger className="bg-[#111] border-gray-600">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMABLE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={assignPriority}
                onValueChange={(v) => setAssignPriority(v as 'best' | 'alternative')}
              >
                <SelectTrigger className="bg-[#111] border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best</SelectItem>
                  <SelectItem value="alternative">Alternative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignConsumable}
              disabled={!selectedConsumable || !assignSpec || !assignCategory || assigning}
            >
              {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Consumable Item Component
function ConsumableItem({
  consumable,
  editMode,
  onRemove,
}: {
  consumable: ConsumableType;
  editMode: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 py-0.5 group">
      <a
        href={`https://www.wowhead.com/tbc/item=${consumable.wowheadId}`}
        target="_blank"
        rel="noopener noreferrer"
        data-wowhead={`item=${consumable.wowheadId}&domain=tbc`}
        className="flex items-center gap-1.5 hover:opacity-80"
      >
        <img
          src={getItemIconUrl(consumable.icon || 'inv_misc_questionmark', 'small')}
          alt={consumable.name}
          className="w-4 h-4 rounded"
        />
        <span className="text-xs text-green-400 hover:underline">{consumable.name}</span>
      </a>
      {editMode && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
