'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Filter,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useTeam } from '@/components/providers/team-provider';
import { CLASS_COLORS } from '@hooligans/shared';

type Application = {
  id: string;
  discordId: string;
  discordName: string;
  inGameName: string;
  characterName: string;
  realm?: string;
  class: string;
  mainSpec: string;
  offSpec?: string;
  professions?: string;
  warcraftLogsUrl?: string;
  raidExperience?: string;
  availability: boolean;
  uiScreenshot?: string;
  gearScreenshot?: string;
  additionalInfo?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  officerNotes?: string;
  wclBestPerf?: number;
  wclMedianPerf?: number;
  wclParseCount?: number;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    id: string;
    name?: string;
    discordName?: string;
  };
  team: {
    id: string;
    name: string;
  };
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-500/20 text-blue-500', icon: Eye },
  APPROVED: { label: 'Approved', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/20 text-red-500', icon: XCircle },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-500/20 text-gray-500', icon: XCircle },
};

const WOW_CLASSES = [
  'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'
];

export default function ApplicationsPage() {
  const { selectedTeam } = useTeam();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [officerNotes, setOfficerNotes] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const fetchApplications = useCallback(async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('teamId', selectedTeam.id);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (classFilter !== 'all') params.set('class', classFilter);

      const res = await fetch(`/api/applications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, statusFilter, classFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenDetail = (application: Application) => {
    setSelectedApplication(application);
    setOfficerNotes(application.officerNotes || '');
    setIsDetailOpen(true);
  };

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW') => {
    if (!selectedApplication) return;

    setIsProcessing(true);
    try {
      const endpoint = status === 'APPROVED'
        ? `/api/applications/${selectedApplication.id}/approve`
        : status === 'REJECTED'
        ? `/api/applications/${selectedApplication.id}/reject`
        : `/api/applications/${selectedApplication.id}`;

      const method = status === 'UNDER_REVIEW' ? 'PATCH' : 'POST';
      const body = status === 'UNDER_REVIEW'
        ? { status: 'UNDER_REVIEW', officerNotes }
        : { officerNotes };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchApplications();
        setIsDetailOpen(false);
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Failed to update application:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedApplication) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/applications/${selectedApplication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerNotes }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedApplication(updated);
        setApplications(prev =>
          prev.map(app => app.id === updated.id ? updated : app)
        );
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.discordName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const reviewCount = applications.filter(a => a.status === 'UNDER_REVIEW').length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground">
            Review and manage guild applications
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-500">({pendingCount} pending)</span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={fetchApplications}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {WOW_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Applications</h3>
            <p className="text-muted-foreground">
              {applications.length === 0
                ? 'No applications have been submitted yet.'
                : 'No applications match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => {
            const StatusIcon = STATUS_CONFIG[application.status].icon;
            return (
              <Card
                key={application.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleOpenDetail(application)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold"
                          style={{ color: CLASS_COLORS[application.class] }}
                        >
                          {application.characterName}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">
                          {application.mainSpec.replace(application.class, '')} {application.class}
                        </span>
                        <Badge className={STATUS_CONFIG[application.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[application.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{application.discordName}</span>
                        {application.wclBestPerf && (
                          <span className="text-purple-400">
                            Best: {application.wclBestPerf.toFixed(1)}
                          </span>
                        )}
                        {application.gearScreenshot && (
                          <span className="text-green-400">Gear ✓</span>
                        )}
                        {!application.gearScreenshot && (
                          <span className="text-red-400">Gear ✗</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(application.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Application Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span style={{ color: CLASS_COLORS[selectedApplication.class] }}>
                    {selectedApplication.characterName}
                  </span>
                  <span className="text-muted-foreground font-normal">
                    - {selectedApplication.mainSpec.replace(selectedApplication.class, '')} {selectedApplication.class}
                  </span>
                  <Badge className={STATUS_CONFIG[selectedApplication.status].color}>
                    {STATUS_CONFIG[selectedApplication.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Applied {formatDate(selectedApplication.createdAt)} • Discord: {selectedApplication.discordName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Character Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Realm</Label>
                    <p>{selectedApplication.realm || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Off-Spec</Label>
                    <p>{selectedApplication.offSpec?.replace(selectedApplication.class, '') || 'None'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Professions</Label>
                    <p>{selectedApplication.professions || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Availability</Label>
                    <p>{selectedApplication.availability ? '✓ Can maintain 90%+ attendance' : '✗ Cannot confirm attendance'}</p>
                  </div>
                </div>

                {/* Warcraft Logs */}
                {selectedApplication.warcraftLogsUrl && (
                  <div>
                    <Label className="text-muted-foreground">Warcraft Logs</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={selectedApplication.warcraftLogsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        View Logs <ExternalLink className="h-3 w-3" />
                      </a>
                      {selectedApplication.wclBestPerf && (
                        <span className="text-sm">
                          (Best: <span className="text-purple-400">{selectedApplication.wclBestPerf.toFixed(1)}</span>
                          {selectedApplication.wclMedianPerf && (
                            <>, Median: <span className="text-blue-400">{selectedApplication.wclMedianPerf.toFixed(1)}</span></>
                          )})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Raid Experience */}
                {selectedApplication.raidExperience && (
                  <div>
                    <Label className="text-muted-foreground">Raid Experience</Label>
                    <p className="whitespace-pre-wrap text-sm mt-1">{selectedApplication.raidExperience}</p>
                  </div>
                )}

                {/* Screenshots */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedApplication.gearScreenshot && (
                    <div>
                      <Label className="text-muted-foreground">Gear Screenshot</Label>
                      <a href={selectedApplication.gearScreenshot} target="_blank" rel="noopener noreferrer">
                        <img
                          src={selectedApplication.gearScreenshot}
                          alt="Gear"
                          className="mt-1 rounded border max-h-48 object-cover cursor-pointer hover:opacity-80"
                        />
                      </a>
                    </div>
                  )}
                  {selectedApplication.uiScreenshot && (
                    <div>
                      <Label className="text-muted-foreground">UI Screenshot</Label>
                      <a href={selectedApplication.uiScreenshot} target="_blank" rel="noopener noreferrer">
                        <img
                          src={selectedApplication.uiScreenshot}
                          alt="UI"
                          className="mt-1 rounded border max-h-48 object-cover cursor-pointer hover:opacity-80"
                        />
                      </a>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {selectedApplication.additionalInfo && (
                  <div>
                    <Label className="text-muted-foreground">Additional Information</Label>
                    <p className="whitespace-pre-wrap text-sm mt-1">{selectedApplication.additionalInfo}</p>
                  </div>
                )}

                {/* Officer Notes */}
                <div>
                  <Label htmlFor="officerNotes">Officer Notes</Label>
                  <Textarea
                    id="officerNotes"
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    placeholder="Add notes about this application..."
                    rows={3}
                    className="mt-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleSaveNotes}
                    disabled={isProcessing}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selectedApplication.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                    disabled={isProcessing}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </Button>
                )}
                {(selectedApplication.status === 'PENDING' || selectedApplication.status === 'UNDER_REVIEW') && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus('REJECTED')}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus('APPROVED')}
                      disabled={isProcessing}
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
