'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  ExternalLink,
  MessageSquare,
  Archive,
  ArchiveRestore,
  Trash2,
  RefreshCw,
  Users,
  Calendar,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeam } from '@/components/providers/team-provider';
import { CLASS_COLORS, RAIDS } from '@hooligans/shared';

type Player = {
  id: string;
  name: string;
  class: string;
  discordId?: string;
};

type FeedbackChannel = {
  id: string;
  playerId: string;
  discordChannelId: string;
  channelName: string;
  isArchived: boolean;
  createdAt: string;
  archivedAt?: string;
  player: Player;
};

type RaidPerformance = {
  id: string;
  teamId: string;
  raidDate: string;
  raidNames: string; // JSON array
  wclUrl?: string;
  rpbUrl?: string;
  claUrl?: string;
  notes?: string;
  createdAt: string;
  feedbackChannels: FeedbackChannel[];
};

export default function PerformancePage() {
  const { selectedTeam } = useTeam();
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<RaidPerformance[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPerformance, setSelectedPerformance] = useState<RaidPerformance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState<string | null>(null);
  const [archivingChannel, setArchivingChannel] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    raidDate: new Date().toISOString().split('T')[0],
    raidNames: [] as string[],
    wclUrl: '',
    rpbUrl: '',
    claUrl: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      const [performancesRes, playersRes] = await Promise.all([
        fetch(`/api/performance?teamId=${selectedTeam.id}`),
        fetch(`/api/players?teamId=${selectedTeam.id}`),
      ]);

      if (performancesRes.ok) {
        const data = await performancesRes.json();
        setPerformances(data);
      }

      if (playersRes.ok) {
        const data = await playersRes.json();
        setPlayers(data.filter((p: Player & { active?: boolean }) => p.active !== false));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePerformance = async () => {
    if (!selectedTeam || !formData.raidDate || formData.raidNames.length === 0) return;

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam.id,
          raidDate: formData.raidDate,
          raidNames: JSON.stringify(formData.raidNames),
          wclUrl: formData.wclUrl,
          rpbUrl: formData.rpbUrl,
          claUrl: formData.claUrl,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        const newPerformance = await res.json();
        setPerformances((prev) => [newPerformance, ...prev]);
        setIsCreateDialogOpen(false);
        setFormData({
          raidDate: new Date().toISOString().split('T')[0],
          raidNames: [],
          wclUrl: '',
          rpbUrl: '',
          claUrl: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Failed to create performance:', error);
    }
  };

  const handleDeletePerformance = async (id: string) => {
    if (!confirm('Delete this performance record?')) return;

    try {
      const res = await fetch(`/api/performance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPerformances((prev) => prev.filter((p) => p.id !== id));
        if (selectedPerformance?.id === id) {
          setSelectedPerformance(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete performance:', error);
    }
  };

  const handleCreateFeedbackChannel = async (playerId: string) => {
    if (!selectedPerformance) return;

    setCreatingChannel(playerId);
    try {
      const res = await fetch('/api/discord/create-feedback-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          raidPerformanceId: selectedPerformance.id,
        }),
      });

      if (res.ok) {
        // Refresh the selected performance to get updated channels
        const performanceRes = await fetch(`/api/performance/${selectedPerformance.id}`);
        if (performanceRes.ok) {
          const updated = await performanceRes.json();
          setSelectedPerformance(updated);
          setPerformances((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      } else {
        const error = await res.json();
        const errorMsg = error.hint
          ? `${error.error}\n\nHint: ${error.hint}\n\nDetails: ${error.discordError || JSON.stringify(error.details)}`
          : error.error || 'Failed to create channel';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to create feedback channel:', error);
    } finally {
      setCreatingChannel(null);
    }
  };

  const handleArchiveChannel = async (channelId: string, archive: boolean) => {
    if (!selectedPerformance) return;

    setArchivingChannel(channelId);

    // Optimistic update - immediately update UI
    const updateChannelStatus = (isArchived: boolean) => {
      const updatedPerformance = {
        ...selectedPerformance,
        feedbackChannels: selectedPerformance.feedbackChannels.map((c) =>
          c.discordChannelId === channelId
            ? { ...c, isArchived, archivedAt: isArchived ? new Date().toISOString() : undefined }
            : c
        ),
      };
      setSelectedPerformance(updatedPerformance);
      setPerformances((prev) =>
        prev.map((p) => (p.id === updatedPerformance.id ? updatedPerformance : p))
      );
    };

    // Apply optimistic update
    updateChannelStatus(archive);

    try {
      const res = await fetch('/api/discord/archive-channel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, archive }),
      });

      if (!res.ok) {
        // Revert on failure
        updateChannelStatus(!archive);
        console.error('Failed to archive/unarchive channel');
      }
    } catch (error) {
      // Revert on error
      updateChannelStatus(!archive);
      console.error('Failed to archive/unarchive channel:', error);
    } finally {
      setArchivingChannel(null);
    }
  };

  const getPlayerChannelStatus = (playerId: string): FeedbackChannel | undefined => {
    return selectedPerformance?.feedbackChannels.find((c) => c.playerId === playerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground">
            Track raid performance and manage feedback channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Performance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Raid Performance</DialogTitle>
                <DialogDescription>
                  Create a new raid performance record to track logs and feedback.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raid Date</label>
                  <Input
                    type="date"
                    value={formData.raidDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, raidDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raids</label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px]">
                    {formData.raidNames.map((raid) => (
                      <span
                        key={raid}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-sm"
                      >
                        {raid}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              raidNames: prev.raidNames.filter((r) => r !== raid),
                            }))
                          }
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {formData.raidNames.length === 0 && (
                      <span className="text-muted-foreground text-sm">Select raids below...</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {RAIDS.filter((raid) => !formData.raidNames.includes(raid.name)).map((raid) => (
                      <button
                        key={raid.name}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            raidNames: [...prev.raidNames, raid.name],
                          }))
                        }
                        className="px-2 py-1 text-xs border rounded hover:bg-muted transition-colors"
                      >
                        + {raid.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Warcraft Logs URL</label>
                  <Input
                    placeholder="https://classic.warcraftlogs.com/reports/..."
                    value={formData.wclUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, wclUrl: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">RPB URL</label>
                    <Input
                      placeholder="RPB sheet URL..."
                      value={formData.rpbUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, rpbUrl: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CLA URL</label>
                    <Input
                      placeholder="CLA sheet URL..."
                      value={formData.claUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, claUrl: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Any notes about this raid..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePerformance}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* RPB & CLA Analysis Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="rpb" className="w-full">
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
              <TabsList>
                <TabsTrigger value="rpb">RPB Analysis</TabsTrigger>
                <TabsTrigger value="cla">CLA Analysis</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <a
                  href="https://docs.google.com/spreadsheets/d/1CVUc5YIl8cTD6HYw8JCF7b91JLHrMMPrwpEQfANl_BA/edit?gid=1016834694#gid=1016834694"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  RPB <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://docs.google.com/spreadsheets/d/1PqP0g10a652X4OgURb8lELLjGGBUv591q8zYpET-0QI/edit?gid=1843677088#gid=1843677088"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  CLA <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <TabsContent value="rpb" className="mt-0 p-4 pt-2">
              <div className="h-[600px] bg-muted rounded-lg overflow-hidden">
                <iframe
                  src="https://docs.google.com/spreadsheets/d/1CVUc5YIl8cTD6HYw8JCF7b91JLHrMMPrwpEQfANl_BA/edit?rm=minimal"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </TabsContent>
            <TabsContent value="cla" className="mt-0 p-4 pt-2">
              <div className="h-[600px] bg-muted rounded-lg overflow-hidden">
                <iframe
                  src="https://docs.google.com/spreadsheets/d/1PqP0g10a652X4OgURb8lELLjGGBUv591q8zYpET-0QI/edit?rm=minimal"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* Performances List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Raid Performances ({performances.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Raid
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      WCL
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Channels
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performances.map((perf) => (
                    <tr
                      key={perf.id}
                      className={`border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedPerformance?.id === perf.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedPerformance(perf)}
                    >
                      <td className="py-2 px-3">
                        {new Date(perf.raidDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {(() => {
                          try {
                            const names = JSON.parse(perf.raidNames);
                            return Array.isArray(names) ? names.join(', ') : perf.raidNames;
                          } catch {
                            return perf.raidNames;
                          }
                        })()}
                      </td>
                      <td className="py-2 px-3">
                        {perf.wclUrl ? (
                          <a
                            href={perf.wclUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-muted-foreground">
                          {perf.feedbackChannels?.length || 0}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePerformance(perf.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {performances.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No performance records yet. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Channels */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback Channels
              {selectedPerformance && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({(() => {
                    try {
                      const names = JSON.parse(selectedPerformance.raidNames);
                      return Array.isArray(names) ? names.join(', ') : selectedPerformance.raidNames;
                    } catch {
                      return selectedPerformance.raidNames;
                    }
                  })()} - {new Date(selectedPerformance.raidDate).toLocaleDateString()})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedPerformance ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Select a performance record to manage feedback channels
              </div>
            ) : (
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        Player
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const channel = getPlayerChannelStatus(player.id);
                      const isCreating = creatingChannel === player.id;

                      return (
                        <tr
                          key={player.id}
                          className="border-b border-border/50 hover:bg-muted/50"
                        >
                          <td className="py-2 px-3">
                            <span
                              style={{ color: CLASS_COLORS[player.class] }}
                              className="font-medium"
                            >
                              {player.name}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {channel ? (
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  channel.isArchived
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-green-500/20 text-green-500'
                                }`}
                              >
                                {channel.isArchived ? 'Archived' : 'Active'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No channel
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {channel ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleArchiveChannel(
                                        channel.discordChannelId,
                                        !channel.isArchived
                                      )
                                    }
                                    disabled={archivingChannel === channel.discordChannelId}
                                    title={channel.isArchived ? 'Unarchive' : 'Archive'}
                                  >
                                    {archivingChannel === channel.discordChannelId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : channel.isArchived ? (
                                      <ArchiveRestore className="h-4 w-4" />
                                    ) : (
                                      <Archive className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <a
                                    href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_GUILD_ID}/${channel.discordChannelId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </a>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCreateFeedbackChannel(player.id)}
                                  disabled={isCreating || !player.discordId}
                                  title={
                                    !player.discordId
                                      ? 'Player has no Discord ID linked'
                                      : 'Create feedback channel'
                                  }
                                >
                                  {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Create
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {players.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-muted-foreground">
                          No players found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
