'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Plus,
  ExternalLink,
  MessageSquare,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Copy,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeam } from '@/components/providers/team-provider';
import { CLASS_COLORS } from '@hooligans/shared';

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

type LogLink = {
  id: string;
  url: string;
  timestamp: string;
  author: string;
};

export default function PerformancePage() {
  const { selectedTeam } = useTeam();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allFeedbackChannels, setAllFeedbackChannels] = useState<FeedbackChannel[]>([]);
  const [creatingChannel, setCreatingChannel] = useState<string | null>(null);
  const [archivingChannel, setArchivingChannel] = useState<string | null>(null);
  const [logLinks, setLogLinks] = useState<LogLink[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      const [playersRes, channelsRes] = await Promise.all([
        fetch(`/api/players?teamId=${selectedTeam.id}`),
        fetch(`/api/discord/feedback-channels?teamId=${selectedTeam.id}`),
      ]);

      if (playersRes.ok) {
        const data = await playersRes.json();
        setPlayers(data.filter((p: Player & { active?: boolean }) => p.active !== false));
      }

      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setAllFeedbackChannels(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  const fetchLogLinks = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/discord/log-links');
      if (res.ok) {
        const data = await res.json();
        setLogLinks(data);
      }
    } catch (error) {
      console.error('Failed to fetch log links:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchLogLinks();
  }, [fetchData, fetchLogLinks]);

  const handleCreateFeedbackChannel = async (playerId: string) => {
    setCreatingChannel(playerId);
    try {
      const res = await fetch('/api/discord/create-feedback-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (res.ok) {
        const newChannel = await res.json();
        if (newChannel.channel) {
          setAllFeedbackChannels((prev) => [...prev, newChannel.channel]);
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
    setArchivingChannel(channelId);

    // Optimistic update
    setAllFeedbackChannels((prev) =>
      prev.map((c) =>
        c.discordChannelId === channelId
          ? { ...c, isArchived: archive, archivedAt: archive ? new Date().toISOString() : undefined }
          : c
      )
    );

    try {
      const res = await fetch('/api/discord/archive-channel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, archive }),
      });

      if (!res.ok) {
        // Revert on failure
        setAllFeedbackChannels((prev) =>
          prev.map((c) =>
            c.discordChannelId === channelId
              ? { ...c, isArchived: !archive, archivedAt: !archive ? new Date().toISOString() : undefined }
              : c
          )
        );
      }
    } catch (error) {
      // Revert on error
      setAllFeedbackChannels((prev) =>
        prev.map((c) =>
          c.discordChannelId === channelId
            ? { ...c, isArchived: !archive, archivedAt: !archive ? new Date().toISOString() : undefined }
            : c
        )
      );
    } finally {
      setArchivingChannel(null);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getPlayerChannelStatus = (playerId: string): FeedbackChannel | undefined => {
    return allFeedbackChannels.find((c) => c.playerId === playerId && !c.isArchived);
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
            Analyze raid logs and manage feedback channels
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchLogLinks(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top row: Log Links and Feedback Channels side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log Links from Discord */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Recent Logs
              <span className="text-muted-foreground font-normal text-sm ml-2">
                (copy & paste into sheets)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logLinks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No log links found.
              </p>
            ) : (
              <div className="space-y-2">
                {logLinks.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <a
                        href={log.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline truncate block"
                      >
                        {log.url.split('/reports/')[1]}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.url, log.id)}
                      className="ml-2 shrink-0"
                    >
                      {copiedId === log.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Channels */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback Channels
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({allFeedbackChannels.filter(c => !c.isArchived).length} active)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[200px]">
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
                        <td className="py-1.5 px-3">
                          <span
                            style={{ color: CLASS_COLORS[player.class] }}
                            className="font-medium"
                          >
                            {player.name}
                          </span>
                        </td>
                        <td className="py-1.5 px-3">
                          {channel ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-500">
                              Active
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {channel ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleArchiveChannel(channel.discordChannelId, true)
                                  }
                                  disabled={archivingChannel === channel.discordChannelId}
                                  title="Archive"
                                  className="h-7 w-7 p-0"
                                >
                                  {archivingChannel === channel.discordChannelId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <a
                                  href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_GUILD_ID}/${channel.discordChannelId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateFeedbackChannel(player.id)}
                                disabled={isCreating || !player.discordId}
                                className="h-7 text-xs"
                              >
                                {isCreating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
              <div className="h-[calc(100vh-320px)] min-h-[600px] bg-muted rounded-lg overflow-hidden">
                <iframe
                  src="https://docs.google.com/spreadsheets/d/1CVUc5YIl8cTD6HYw8JCF7b91JLHrMMPrwpEQfANl_BA/edit?rm=minimal"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </TabsContent>
            <TabsContent value="cla" className="mt-0 p-4 pt-2">
              <div className="h-[calc(100vh-320px)] min-h-[600px] bg-muted rounded-lg overflow-hidden">
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

    </div>
  );
}
