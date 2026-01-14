'use client';

import { useState } from 'react';
import { CLASS_COLORS } from '@hooligans/shared';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  daysSinceLastItem: string; // Format: "X/Y"
};

type RaidersTableProps = {
  raiders: RaiderStats[];
};

type SortField = 'name' | 'lootThisRaid' | 'totalLootCurrentPhase' | 'bisPercent' | 'totalItems' | 'daysSinceLastItem';
type SortOrder = 'asc' | 'desc';

// Role color coding based on the Excel reference
const getRoleColor = (role: string, roleSubtype: string) => {
  if (role === 'Tank') return '#3b82f6'; // Blue
  if (role === 'Heal') return '#22c55e'; // Green
  if (roleSubtype === 'DPS_Melee') return '#06b6d4'; // Cyan
  if (roleSubtype === 'DPS_Ranged') return '#f97316'; // Orange
  if (roleSubtype === 'DPS_Caster') return '#22c55e'; // Green (same as healers)
  return '#ec4899'; // Pink for others
};

// Parse "X/Y" format to get first number for sorting
const parseDaysSince = (days: string): number => {
  const match = days.match(/^(-?\d+)/);
  if (match) return parseInt(match[1]);
  return 999; // Put "-/X" entries at the end
};

export function RaidersTable({ raiders }: RaidersTableProps) {
  const [sortField, setSortField] = useState<SortField>('lootThisRaid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to desc for numbers, asc for names
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedRaiders = [...raiders].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'lootThisRaid':
        comparison = a.lootThisRaid - b.lootThisRaid;
        break;
      case 'totalLootCurrentPhase':
        comparison = a.totalLootCurrentPhase - b.totalLootCurrentPhase;
        break;
      case 'bisPercent':
        comparison = a.bisPercent - b.bisPercent;
        break;
      case 'totalItems':
        comparison = a.totalItems - b.totalItems;
        break;
      case 'daysSinceLastItem':
        comparison = parseDaysSince(a.daysSinceLastItem) - parseDaysSince(b.daysSinceLastItem);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const headerClass = "py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none";

  return (
    <div className="overflow-auto max-h-[calc(100vh-200px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th
              className={`text-left ${headerClass} min-w-[120px]`}
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                Raiders
                <SortIcon field="name" />
              </div>
            </th>
            <th
              className={`text-center ${headerClass} w-16`}
              onClick={() => handleSort('lootThisRaid')}
              title="Loot this raid"
            >
              <div className="flex items-center justify-center gap-1">
                LtR
                <SortIcon field="lootThisRaid" />
              </div>
            </th>
            <th
              className={`text-center ${headerClass} w-16`}
              onClick={() => handleSort('totalLootCurrentPhase')}
              title="Total Loot Current Phase"
            >
              <div className="flex items-center justify-center gap-1">
                TLC
                <SortIcon field="totalLootCurrentPhase" />
              </div>
            </th>
            <th
              className={`text-center ${headerClass} w-16`}
              onClick={() => handleSort('bisPercent')}
              title="BiS %"
            >
              <div className="flex items-center justify-center gap-1">
                BiS%
                <SortIcon field="bisPercent" />
              </div>
            </th>
            <th
              className={`text-center ${headerClass} w-16`}
              onClick={() => handleSort('totalItems')}
              title="Total Items"
            >
              <div className="flex items-center justify-center gap-1">
                Items
                <SortIcon field="totalItems" />
              </div>
            </th>
            <th
              className={`text-center ${headerClass} w-20`}
              onClick={() => handleSort('daysSinceLastItem')}
              title="Days Since Last Item"
            >
              <div className="flex items-center justify-center gap-1">
                Days
                <SortIcon field="daysSinceLastItem" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRaiders.map((raider, index) => {
            const roleColor = getRoleColor(raider.role, raider.roleSubtype);
            return (
              <tr
                key={raider.id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                style={{ backgroundColor: `${roleColor}10` }}
              >
                <td className="py-1.5 px-2 text-muted-foreground">{index + 1}</td>
                <td className="py-1.5 px-2">
                  <span
                    className="font-medium truncate block"
                    style={{ color: CLASS_COLORS[raider.class] }}
                  >
                    {raider.name}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-center">{raider.lootThisRaid}</td>
                <td className="py-1.5 px-2 text-center">{raider.totalLootCurrentPhase}</td>
                <td className="py-1.5 px-2 text-center">{raider.bisPercent.toFixed(0)}%</td>
                <td className="py-1.5 px-2 text-center">{raider.totalItems}</td>
                <td className="py-1.5 px-2 text-center text-muted-foreground">
                  {raider.daysSinceLastItem}
                </td>
              </tr>
            );
          })}
          {raiders.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-muted-foreground">
                No raiders in roster yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
