'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { CLASS_COLORS } from '@hooligans/shared';

type RaiderStats = {
  id: string;
  name: string;
  class: string;
  role: string;
  roleSubtype: string;
  lootThisRaid: number;
  totalLootCurrentPhase: number;
  lootPoints: number;
  bisPercent: number;
  totalItems: number;
  daysSinceLastItem: string; // Format: "X/Y"
  gearSlots: {
    tier: boolean;
    head: boolean;
    shoulder: boolean;
    chest: boolean;
    wrist: boolean;
    hands: boolean;
    waist: boolean;
    legs: boolean;
    feet: boolean;
  };
};

type RaidersTableProps = {
  raiders: RaiderStats[];
  onToggleGearSlot: (playerId: string, slot: string, checked: boolean) => void;
};

const GEAR_SLOTS = [
  { key: 'tier', label: 'Tier' },
  { key: 'head', label: 'Head' },
  { key: 'shoulder', label: 'Shou' },
  { key: 'chest', label: 'Chest' },
  { key: 'wrist', label: 'Wrist' },
  { key: 'hands', label: 'Hand' },
  { key: 'waist', label: 'Waist' },
  { key: 'legs', label: 'Legs' },
  { key: 'feet', label: 'Feet' },
];

// Role color coding based on the Excel reference
const getRoleColor = (role: string, roleSubtype: string) => {
  if (role === 'Tank') return '#3b82f6'; // Blue
  if (role === 'Heal') return '#22c55e'; // Green
  if (roleSubtype === 'DPS_Melee') return '#06b6d4'; // Cyan
  if (roleSubtype === 'DPS_Ranged') return '#f97316'; // Orange
  if (roleSubtype === 'DPS_Caster') return '#22c55e'; // Green (same as healers)
  return '#ec4899'; // Pink for others
};

export function RaidersTable({ raiders, onToggleGearSlot }: RaidersTableProps) {
  return (
    <div className="overflow-auto max-h-[calc(100vh-200px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-1 font-medium text-muted-foreground w-6">#</th>
            <th className="text-left py-2 px-1 font-medium text-muted-foreground min-w-[100px]">Raiders</th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-12" title="Loot this raid">LtR</th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-12" title="Total Loot Current Phase">TLC</th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-14" title="Loot Points">Pts</th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-14" title="BiS %">BiS%</th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-16" title="Days Since Last Item">Days</th>
            {GEAR_SLOTS.map((slot) => (
              <th
                key={slot.key}
                className="text-center py-2 px-0.5 font-medium text-muted-foreground w-10"
                title={slot.label}
              >
                {slot.label}
              </th>
            ))}
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
                <td className="py-1 px-1 text-muted-foreground text-xs">{index + 1}</td>
                <td className="py-1 px-1">
                  <span
                    className="font-medium text-xs truncate block"
                    style={{ color: CLASS_COLORS[raider.class] }}
                  >
                    {raider.name}
                  </span>
                </td>
                <td className="py-1 px-1 text-center text-xs">{raider.lootThisRaid}</td>
                <td className="py-1 px-1 text-center text-xs">{raider.totalLootCurrentPhase}</td>
                <td className="py-1 px-1 text-center text-xs">{raider.lootPoints.toFixed(2)}</td>
                <td className="py-1 px-1 text-center text-xs">{raider.bisPercent.toFixed(0)}%</td>
                <td className="py-1 px-1 text-center text-xs text-muted-foreground">
                  {raider.daysSinceLastItem}
                </td>
                {GEAR_SLOTS.map((slot) => (
                  <td key={slot.key} className="py-1 px-0.5 text-center">
                    <Checkbox
                      checked={raider.gearSlots[slot.key as keyof typeof raider.gearSlots]}
                      onCheckedChange={(checked) =>
                        onToggleGearSlot(raider.id, slot.key, checked === true)
                      }
                      className="h-4 w-4"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
          {raiders.length === 0 && (
            <tr>
              <td colSpan={16} className="py-8 text-center text-muted-foreground">
                No raiders in roster yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
