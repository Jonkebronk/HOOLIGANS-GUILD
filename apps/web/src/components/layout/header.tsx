'use client';

import { Bell, Search, LogOut, User, ChevronDown, Users } from 'lucide-react';
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
  'PuG': '/teams/pug.jpg',
};

function TeamIcon({ teamName, className = "h-5 w-5" }: { teamName: string; className?: string }) {
  const iconUrl = TEAM_ICONS[teamName];

  if (iconUrl) {
    return <img src={iconUrl} alt={teamName} className={className} />;
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
              <TeamIcon teamName={selectedTeam?.name || ''} className="h-5 w-5" />
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
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
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
