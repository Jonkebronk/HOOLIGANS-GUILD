'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, UserX } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl } from '@/lib/wowhead';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    wowClass: string;
    mainSpec: string;
    role: string;
    attendance: number;
    bisPercent: number;
    active: boolean;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string) => void;
}

const ROLE_COLORS = {
  Tank: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  Heal: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  DPS: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
};

export function PlayerCard({ player, onEdit, onDelete, onToggleActive }: PlayerCardProps) {
  const classColor = CLASS_COLORS[player.wowClass] || '#FFFFFF';
  const specName = player.mainSpec.replace(player.wowClass, '').trim();
  const roleStyle = ROLE_COLORS[player.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.DPS;

  const getAttendanceColor = (percent: number) => {
    if (percent >= 90) return { text: 'text-green-400', bar: 'bg-green-500' };
    if (percent >= 75) return { text: 'text-yellow-400', bar: 'bg-yellow-500' };
    return { text: 'text-red-400', bar: 'bg-red-500' };
  };

  const getBisColor = (percent: number) => {
    if (percent >= 80) return { text: 'text-purple-400', bar: 'bg-purple-500' };
    if (percent >= 50) return { text: 'text-blue-400', bar: 'bg-blue-500' };
    return { text: 'text-gray-400', bar: 'bg-gray-500' };
  };

  const attendanceStyle = getAttendanceColor(player.attendance);
  const bisStyle = getBisColor(player.bisPercent);

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar with initials or spec icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${classColor}20`,
                border: `2px solid ${classColor}`,
                color: classColor,
              }}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: classColor }}>
                {player.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <img
                  src={getSpecIconUrl(player.mainSpec)}
                  alt={player.mainSpec}
                  className="w-4 h-4 rounded"
                />
                {specName} {player.wowClass}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(player.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive?.(player.id)}>
                <UserX className="h-4 w-4 mr-2" />
                {player.active ? 'Mark Inactive' : 'Mark Active'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(player.id)} className="text-red-400">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Role & Status Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded',
              roleStyle.bg,
              roleStyle.text
            )}
          >
            {player.role}
          </span>
          {player.active ? (
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
              Active
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Inactive
            </span>
          )}
        </div>

        {/* Stats with Progress Bars */}
        <div className="space-y-3">
          {/* Attendance */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Attendance</span>
            <span className={cn('text-xs font-medium', attendanceStyle.text)}>
              {player.attendance}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className={cn('h-1 rounded-full transition-all', attendanceStyle.bar)}
              style={{ width: `${player.attendance}%` }}
            />
          </div>

          {/* BiS Progress */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">BiS Progress</span>
            <span className={cn('text-xs font-medium', bisStyle.text)}>
              {player.bisPercent}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className={cn('h-1 rounded-full transition-all', bisStyle.bar)}
              style={{ width: `${player.bisPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
