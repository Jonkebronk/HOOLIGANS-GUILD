'use client';

import { useState, useEffect } from 'react';
import { Search, LogOut, User, ChevronDown, Users } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeam } from '@/components/providers/team-provider';
import { useRouter } from 'next/navigation';

// Team icon mapping
const TEAM_ICONS: Record<string, string> = {
  'TEAM NATO': '/teams/nato.png',
  'TEAM SWEDEN': '/teams/sweden.png',
  'PuGs': '/teams/pug.jpg',
};

function TeamIcon({ teamName, className = "h-5 w-5" }: { teamName?: string; className?: string }) {
  const iconUrl = teamName ? TEAM_ICONS[teamName] : null;

  if (iconUrl) {
    return <img src={iconUrl} alt={teamName} className={`${className} rounded-full object-cover`} />;
  }

  return <Users className={className} />;
}

interface HeaderProps {
  user?: {
    name: string;
    image?: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const { teams, selectedTeam, setSelectedTeam } = useTeam();
  const [discordRole, setDiscordRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscordRole = async () => {
      try {
        const res = await fetch('/api/discord/user-role');
        if (res.ok) {
          const data = await res.json();
          setDiscordRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch Discord role:', error);
      }
    };
    if (user) {
      fetchDiscordRole();
    }
  }, [user]);

  const handleSwitchTeam = () => {
    setSelectedTeam(null);
    router.push('/select-team');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-6">
      {/* Team Selector + Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Team Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-3">
              <TeamIcon teamName={selectedTeam?.name} className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                {selectedTeam?.name || 'Select Team'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={selectedTeam?.id === team.id ? 'bg-primary/10' : ''}
              >
                <TeamIcon teamName={team.name} className="h-4 w-4 mr-2" />
                {team.name}
                {selectedTeam?.id === team.id && (
                  <span className="ml-auto text-xs text-primary">Active</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSwitchTeam}>
              <span className="text-muted-foreground">Manage Teams...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search players, items..."
            className="pl-10 bg-secondary border-0"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* User Menu */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{discordRole || user.role}</p>
            </div>
            <Avatar>
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
