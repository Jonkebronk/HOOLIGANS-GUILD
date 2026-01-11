'use client';

import { CLASS_COLORS } from '@hooligans/shared';

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

// Role color coding based on the Excel reference
const getRoleColor = (role: string, roleSubtype: string) => {
  if (role === 'Tank') return '#3b82f6'; // Blue
  if (role === 'Heal') return '#22c55e'; // Green
  if (roleSubtype === 'DPS_Melee') return '#06b6d4'; // Cyan
  if (roleSubtype === 'DPS_Ranged') return '#f97316'; // Orange
  if (roleSubtype === 'DPS_Caster') return '#22c55e'; // Green (same as healers)
  return '#ec4899'; // Pink for others
};

export function RaidersTable({ raiders }: RaidersTableProps) {
  return (
    <div className="overflow-auto max-h-[calc(100vh-200px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[120px]">Raiders</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16" title="Loot this raid">LtR</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16" title="Total Loot Current Phase">TLC</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16" title="BiS %">BiS%</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16" title="Total Items">Items</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-20" title="Days Since Last Item">Days</th>
          </tr>
        </thead>
        <tbody>
          {raiders.map((raider, index) => {
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
