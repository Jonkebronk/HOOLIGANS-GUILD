'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, Loader2, Shield, Crown, User } from 'lucide-react';
import { useTeam, Team } from '@/components/providers/team-provider';

// Team icons mapping
const TEAM_ICONS: Record<string, string> = {
  'TEAM NATO': '/teams/nato.png',
  'TEAM SWEDEN': '/teams/sweden.png',
  'PuGs': '/teams/pug.jpg',
};

const ROLE_ICONS = {
  Owner: Crown,
  Admin: Shield,
  Member: User,
};

export default function SelectTeamPage() {
  const router = useRouter();
  const { teams, setSelectedTeam, loading, refetchTeams } = useTeam();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    router.push('/dashboard');
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      if (res.ok) {
        await refetchTeams();
        setIsCreateOpen(false);
        setNewTeamName('');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-bg.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-bg.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/hlg-logo.png"
            alt="HOOLIGANS"
            width={200}
            height={200}
            className="drop-shadow-2xl"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Select Your Team</h1>
          <p className="text-gray-300">Choose which team you want to manage</p>
        </div>

        {/* Teams Grid */}
        {teams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {teams.map((team) => {
              const RoleIcon = ROLE_ICONS[team.role as keyof typeof ROLE_ICONS] || User;
              return (
                <Card
                  key={team.id}
                  className="bg-black/80 backdrop-blur-sm border-border/30 hover:border-primary/50 cursor-pointer transition-all hover:scale-105"
                  onClick={() => handleSelectTeam(team)}
                >
                  <CardContent className="p-6 text-center">
                    {/* Team Icon */}
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden">
                      {TEAM_ICONS[team.name] ? (
                        <Image
                          src={TEAM_ICONS[team.name]}
                          alt={team.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Users className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    {/* Team Name */}
                    <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>{team.playerCount} players</span>
                      <span>{team.memberCount} members</span>
                    </div>

                    {/* Role Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      <RoleIcon className="h-3 w-3" />
                      {team.role}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-black/80 backdrop-blur-sm border-border/30 mb-6">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first team to get started managing your guild.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create Team Button */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsCreateOpen(true)}
            className="bg-black/50 border-border/50 hover:bg-black/80"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Team
          </Button>
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team to manage a separate roster and raid group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g., TEAM NATO, TEAM SWEDEN, PuG"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
