'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { ITEM_QUALITY_COLORS, refreshWowheadTooltips, getItemIconUrl } from '@/lib/wowhead';

type Player = {
  id: string;
  name: string;
  class: string;
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
  tokenRedemptions?: TokenRedemption[];
};

// Token type mappings
const TOKEN_CLASS_MAP: Record<string, string[]> = {
  'Fallen Defender': ['Druid', 'Priest', 'Warrior'],
  'Fallen Hero': ['Hunter', 'Mage', 'Warlock'],
  'Fallen Champion': ['Paladin', 'Rogue', 'Shaman'],
  'Forgotten Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Forgotten Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Forgotten Vanquisher': ['Druid', 'Mage', 'Rogue'],
};

// Detect token type from item name
const getTokenType = (name: string): string | null => {
  for (const tokenType of Object.keys(TOKEN_CLASS_MAP)) {
    if (name.includes(tokenType)) {
      return tokenType;
    }
  }
  return null;
};

// Check if item is a tier token
const isTokenItem = (item: LootItem): boolean => {
  return item.slot === 'Misc' && getTokenType(item.itemName) !== null;
};

type ItemsTableProps = {
  items: LootItem[];
  players: Player[];
  onAssignPlayer: (itemId: string, playerId: string) => void;
  onUpdateResponse: (itemId: string, response: string) => void;
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
}: ItemsTableProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Refresh Wowhead tooltips when items change
  useEffect(() => {
    refreshWowheadTooltips();
  }, [items]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

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
          {items.map((item, index) => {
            const hasRedemptions = isTokenItem(item) && item.tokenRedemptions && item.tokenRedemptions.length > 0;
            const isExpanded = expandedItems.has(item.id);
            const tokenType = getTokenType(item.itemName);
            const tokenClasses = tokenType ? TOKEN_CLASS_MAP[tokenType] : [];

            // Aggregate BiS specs from all redemption items for tokens
            const tokenBisSpecs: string[] = hasRedemptions
              ? [...new Set(
                  (item.tokenRedemptions || [])
                    .flatMap(r => r.redemptionItem.bisFor?.split(',').map(s => s.trim()).filter(Boolean) || [])
                )]
              : [];

            // Use token BiS specs if available, otherwise use regular bisPlayers
            const displayBisPlayers = hasRedemptions && tokenBisSpecs.length > 0
              ? tokenBisSpecs
              : item.bisPlayers || [];

            return (
              <>
                <tr
                  key={item.id}
                  className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${getRowColor(item)} ${hasRedemptions ? 'cursor-pointer' : ''}`}
                  onClick={hasRedemptions ? () => toggleExpand(item.id) : undefined}
                >
                  <td className="py-1.5 px-2 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {hasRedemptions && (
                        isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )
                      )}
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-2">
                      {item.icon && (
                        <img
                          src={getItemIconUrl(item.icon, 'small')}
                          alt=""
                          className="w-6 h-6 rounded flex-shrink-0"
                          style={{
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: ITEM_QUALITY_COLORS[item.quality || 4],
                          }}
                        />
                      )}
                      {item.wowheadId ? (
                        <a
                          href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                          data-wh-icon-size="0"
                          className="hover:underline truncate"
                          style={{ color: ITEM_QUALITY_COLORS[item.quality || 4] }}
                          onClick={(e) => e.stopPropagation()}
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
                      {hasRedemptions && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Token
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
                <div className="text-xs text-muted-foreground truncate" title={item.lootPrio || ''}>
                  {item.lootPrio || '-'}
                </div>
              </td>
              <td className="py-1.5 px-2">
                <div className="flex flex-wrap gap-1">
                  {displayBisPlayers.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/30 text-purple-300 border border-purple-500/50"
                    >
                      {name}
                    </span>
                  ))}
                  {displayBisPlayers.length > 2 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                      +{displayBisPlayers.length - 2}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-2">
                <div className="flex flex-wrap gap-1">
                  {item.bisNextPhasePlayers?.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    >
                      {name}
                    </span>
                  ))}
                  {(item.bisNextPhasePlayers?.length || 0) > 2 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                      +{(item.bisNextPhasePlayers?.length || 0) - 2}
                    </span>
                  )}
                </div>
              </td>
                </tr>
                {/* Expanded token redemption row */}
                {hasRedemptions && isExpanded && (
                  <tr key={`${item.id}-expanded`} className="bg-muted/30">
                    <td colSpan={8} className="py-3 px-4">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Redemption Items
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {tokenClasses.map((className) => {
                            const classRedemptions = (item.tokenRedemptions || []).filter(
                              r => r.className === className
                            );

                            return (
                              <div key={className} className="space-y-1">
                                <div
                                  className="text-sm font-medium"
                                  style={{ color: CLASS_COLORS[className] }}
                                >
                                  {className}
                                </div>
                                {classRedemptions.length > 0 ? (
                                  <div className="space-y-1 pl-2">
                                    {classRedemptions.map((redemption) => {
                                      const lootedBy = redemption.redemptionItem.lootRecords
                                        ?.filter(r => r.player)
                                        .map(r => r.player!);
                                      const bisPlayers = redemption.redemptionItem.bisFor
                                        ? redemption.redemptionItem.bisFor.split(',').map(s => s.trim()).filter(Boolean)
                                        : [];

                                      return (
                                        <div key={redemption.id} className="flex items-center gap-2 flex-wrap">
                                          <a
                                            href={`https://www.wowhead.com/tbc/item=${redemption.redemptionItem.wowheadId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-wh-icon-size="0"
                                            className="flex items-center gap-1.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <img
                                              src={getItemIconUrl(redemption.redemptionItem.icon || 'inv_misc_questionmark', 'small')}
                                              alt=""
                                              className="w-5 h-5 rounded"
                                              style={{
                                                borderWidth: 1,
                                                borderStyle: 'solid',
                                                borderColor: ITEM_QUALITY_COLORS[redemption.redemptionItem.quality] || ITEM_QUALITY_COLORS[4]
                                              }}
                                            />
                                            <span
                                              className="text-xs hover:underline"
                                              style={{ color: ITEM_QUALITY_COLORS[redemption.redemptionItem.quality] || ITEM_QUALITY_COLORS[4] }}
                                            >
                                              {redemption.redemptionItem.name}
                                            </span>
                                          </a>
                                          {lootedBy && lootedBy.length > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                              (Has:{' '}
                                              {lootedBy.map((p, i) => (
                                                <span key={p.id}>
                                                  {i > 0 && ', '}
                                                  <span style={{ color: CLASS_COLORS[p.class] }}>{p.name}</span>
                                                </span>
                                              ))}
                                              )
                                            </span>
                                          )}
                                          {bisPlayers.length > 0 && (
                                            <span className="text-xs">
                                              <span className="text-muted-foreground">BiS:</span>{' '}
                                              {bisPlayers.slice(0, 2).map((name, i) => (
                                                <span key={name} className="text-purple-400">
                                                  {i > 0 && ', '}{name}
                                                </span>
                                              ))}
                                              {bisPlayers.length > 2 && (
                                                <span className="text-muted-foreground"> +{bisPlayers.length - 2}</span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground pl-2">No items linked</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
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
