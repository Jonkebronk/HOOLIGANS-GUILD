'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CLASS_COLORS } from '@hooligans/shared';
import { ITEM_QUALITY_COLORS, refreshWowheadTooltips } from '@/lib/wowhead';

type Player = {
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
  playerId?: string;
  playerName?: string;
  playerClass?: string;
  response?: string;
  lootDate?: string;
  lootPrio?: string;
  bisPlayers?: string[];
  bisNextPhasePlayers?: string[];
};

type ItemsTableProps = {
  items: LootItem[];
  players: Player[];
  onAssignPlayer: (itemId: string, playerId: string) => void;
  onUpdateResponse: (itemId: string, response: string) => void;
  onUpdateLootPrio: (itemId: string, lootPrio: string) => void;
};

const RESPONSE_TYPES = [
  { value: 'BiS', label: 'BiS', color: '#a855f7' },
  { value: 'GreaterUpgrade', label: 'Greater Upgrade', color: '#3b82f6' },
  { value: 'MinorUpgrade', label: 'Minor Upgrade', color: '#22c55e' },
  { value: 'Offspec', label: 'Offspec', color: '#eab308' },
  { value: 'PvP', label: 'PvP', color: '#f97316' },
  { value: 'Disenchant', label: 'Disenchant', color: '#6b7280' },
];

export function ItemsTable({
  items,
  players,
  onAssignPlayer,
  onUpdateResponse,
  onUpdateLootPrio,
}: ItemsTableProps) {
  const [editingLootPrio, setEditingLootPrio] = useState<string | null>(null);

  // Refresh Wowhead tooltips when items change
  useEffect(() => {
    refreshWowheadTooltips();
  }, [items]);

  const getRowColor = (item: LootItem) => {
    if (item.lootPrio) return 'bg-blue-900/20'; // Has loot priority
    if (!item.playerId) return 'bg-green-900/20'; // Unassigned
    return ''; // Default
  };

  return (
    <div className="overflow-auto max-h-[calc(100vh-200px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[200px]">Item</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[140px]">Player</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[130px]">Response</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[90px]">Date</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[140px]">Loot Prio</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[120px]">BiS</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[120px]">BiS Next</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${getRowColor(item)}`}
            >
              <td className="py-1.5 px-2 text-muted-foreground">{index + 1}</td>
              <td className="py-1.5 px-2">
                <div className="flex items-center gap-2">
                  {item.wowheadId ? (
                    <a
                      href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                      className="hover:underline truncate"
                      style={{ color: ITEM_QUALITY_COLORS[item.quality || 4] }}
                    >
                      {item.itemName}
                    </a>
                  ) : (
                    <span
                      className="truncate"
                      style={{ color: ITEM_QUALITY_COLORS[item.quality || 4] }}
                    >
                      {item.itemName}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-2">
                <Select
                  value={item.playerId || 'unassigned'}
                  onValueChange={(value) => onAssignPlayer(item.id, value === 'unassigned' ? '' : value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select...">
                      {item.playerName ? (
                        <span style={{ color: CLASS_COLORS[item.playerClass || ''] }}>
                          {item.playerName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <span style={{ color: CLASS_COLORS[player.class] }}>
                          {player.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5 px-2">
                <Select
                  value={item.response || 'none'}
                  onValueChange={(value) => onUpdateResponse(item.id, value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Response...">
                      {item.response ? (
                        <span
                          style={{
                            color: RESPONSE_TYPES.find((r) => r.value === item.response)?.color,
                          }}
                        >
                          {RESPONSE_TYPES.find((r) => r.value === item.response)?.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select...</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                    {RESPONSE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span style={{ color: type.color }}>{type.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5 px-2 text-muted-foreground text-xs">
                {item.lootDate ? new Date(item.lootDate).toLocaleDateString() : '-'}
              </td>
              <td className="py-1.5 px-2">
                {editingLootPrio === item.id ? (
                  <Input
                    className="h-7 text-xs"
                    defaultValue={item.lootPrio || ''}
                    onBlur={(e) => {
                      onUpdateLootPrio(item.id, e.target.value);
                      setEditingLootPrio(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateLootPrio(item.id, e.currentTarget.value);
                        setEditingLootPrio(null);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                    onClick={() => setEditingLootPrio(item.id)}
                  >
                    {item.lootPrio || <span className="text-muted-foreground/50">Click to add...</span>}
                  </div>
                )}
              </td>
              <td className="py-1.5 px-2">
                <div className="flex flex-wrap gap-0.5">
                  {item.bisPlayers?.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="px-1 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400"
                    >
                      {name}
                    </span>
                  ))}
                  {(item.bisPlayers?.length || 0) > 2 && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-muted">
                      +{(item.bisPlayers?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-2">
                <div className="flex flex-wrap gap-0.5">
                  {item.bisNextPhasePlayers?.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="px-1 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400"
                    >
                      {name}
                    </span>
                  ))}
                  {(item.bisNextPhasePlayers?.length || 0) > 2 && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-muted">
                      +{(item.bisNextPhasePlayers?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-muted-foreground">
                No items yet. Import from RCLootCouncil or add items manually.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
