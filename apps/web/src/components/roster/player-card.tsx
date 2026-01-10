'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, TrendingUp, Calendar } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
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
}

export function PlayerCard({ player }: PlayerCardProps) {
  const classColor = CLASS_COLORS[player.wowClass] || '#FFFFFF';
  const specName = player.mainSpec.replace(player.wowClass, '');

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2" style={{ borderColor: classColor }}>
              <AvatarFallback style={{ backgroundColor: `${classColor}20`, color: classColor }}>
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" style={{ color: classColor }}>
                {player.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {specName} {player.wowClass}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                player.role === 'Tank' && 'bg-blue-500/20 text-blue-400',
                player.role === 'Heal' && 'bg-green-500/20 text-green-400',
                player.role === 'DPS' && 'bg-red-500/20 text-red-400'
              )}
            >
              {player.role}
            </span>
            {player.active ? (
              <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                Active
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Inactive
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className={cn(
                  'text-sm font-medium',
                  player.attendance >= 90 ? 'text-accent' :
                  player.attendance >= 75 ? 'text-yellow-500' : 'text-destructive'
                )}>
                  {player.attendance}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">BiS Progress</p>
                <p className="text-sm font-medium text-quality-epic">
                  {player.bisPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* BiS Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-quality-epic h-1.5 rounded-full transition-all"
              style={{ width: `${player.bisPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
