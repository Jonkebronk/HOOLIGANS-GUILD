'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, CheckCircle, LogIn, X, ExternalLink, TrendingUp } from 'lucide-react';
import { CLASS_SPECS, SPEC_ROLES } from '@hooligans/shared';
import { uploadToCloudinary } from '@/lib/cloudinary';

type Team = {
  id: string;
  name: string;
};

const WOW_CLASSES = [
  'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'
];

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    teamId: '',
    inGameName: '',
    characterName: '',
    realm: '',
    class: '',
    mainSpec: '',
    offSpec: '',
    professions: '',
    warcraftLogsUrl: '',
    raidExperience: '',
    availability: false,
    additionalInfo: '',
  });

  const [uiScreenshot, setUiScreenshot] = useState<string | null>(null);
  const [gearScreenshot, setGearScreenshot] = useState<string | null>(null);
  const [uploadingUi, setUploadingUi] = useState(false);
  const [uploadingGear, setUploadingGear] = useState(false);

  // WCL parse data
  const [wclData, setWclData] = useState<{
    bestPerformanceAverage: number | null;
    medianPerformanceAverage: number | null;
    parseCount: number;
  } | null>(null);
  const [wclLoading, setWclLoading] = useState(false);
  const [wclError, setWclError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        // Auto-select first team if only one
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, teamId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  // Fetch WCL parses when URL is entered
  const fetchWclData = async (url: string) => {
    if (!url || !url.includes('warcraftlogs.com')) {
      setWclData(null);
      setWclError(null);
      return;
    }

    setWclLoading(true);
    setWclError(null);

    try {
      const res = await fetch('/api/warcraft-logs/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();
        setWclData({
          bestPerformanceAverage: data.bestPerformanceAverage,
          medianPerformanceAverage: data.medianPerformanceAverage,
          parseCount: data.parseCount,
        });
      } else {
        const data = await res.json();
        setWclError(data.error || 'Could not fetch logs');
        setWclData(null);
      }
    } catch (err) {
      console.error('WCL fetch failed:', err);
      setWclError('Failed to fetch Warcraft Logs data');
      setWclData(null);
    } finally {
      setWclLoading(false);
    }
  };

  const handleClassChange = (wowClass: string) => {
    setFormData(prev => ({
      ...prev,
      class: wowClass,
      mainSpec: '',
      offSpec: '',
    }));
  };

  const getSpecsForClass = (wowClass: string) => {
    return CLASS_SPECS[wowClass] || [];
  };

  const handleFileUpload = async (
    file: File,
    setUrl: (url: string | null) => void,
    setUploading: (loading: boolean) => void
  ) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadToCloudinary(file);
      setUrl(result.secure_url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!session?.user) {
      setError('You must be logged in to submit an application');
      return;
    }

    if (!formData.teamId || !formData.characterName || !formData.class || !formData.mainSpec) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discordId: (session.user as { discordId?: string }).discordId || session.user.email,
          discordName: session.user.name || 'Unknown',
          uiScreenshot,
          gearScreenshot,
          // Include WCL data if available
          wclBestPerf: wclData?.bestPerformanceAverage ?? null,
          wclMedianPerf: wclData?.medianPerformanceAverage ?? null,
          wclParseCount: wclData?.parseCount ?? null,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show login prompt if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Guild Application</CardTitle>
            <CardDescription>
              Please sign in with Discord to submit your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signIn('discord')}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Sign in with Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for applying. Our officers will review your application and get back to you soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Guild Application</CardTitle>
            <CardDescription>
              Fill out the form below to apply. All fields marked with * are required.
            </CardDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <span>Applying as:</span>
              <span className="font-medium text-foreground">{session.user?.name}</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team Selection */}
              {teams.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="team">Team *</Label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Character Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Character Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="characterName">Character Name *</Label>
                    <Input
                      id="characterName"
                      value={formData.characterName}
                      onChange={(e) => setFormData(prev => ({ ...prev, characterName: e.target.value }))}
                      placeholder="e.g., Legolas"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="realm">Realm/Server</Label>
                    <Input
                      id="realm"
                      value={formData.realm}
                      onChange={(e) => setFormData(prev => ({ ...prev, realm: e.target.value }))}
                      placeholder="e.g., Firemaw"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Select
                      value={formData.class}
                      onValueChange={handleClassChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {WOW_CLASSES.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mainSpec">Main Spec *</Label>
                    <Select
                      value={formData.mainSpec}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, mainSpec: value }))}
                      disabled={!formData.class}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select spec" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSpecsForClass(formData.class).map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec.replace(formData.class, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offSpec">Off Spec</Label>
                    <Select
                      value={formData.offSpec}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, offSpec: value }))}
                      disabled={!formData.class}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select off-spec (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {getSpecsForClass(formData.class).map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec.replace(formData.class, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professions">Professions</Label>
                    <Input
                      id="professions"
                      value={formData.professions}
                      onChange={(e) => setFormData(prev => ({ ...prev, professions: e.target.value }))}
                      placeholder="e.g., Enchanting 375, JC 350"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inGameName">In-Game Name (if different)</Label>
                  <Input
                    id="inGameName"
                    value={formData.inGameName}
                    onChange={(e) => setFormData(prev => ({ ...prev, inGameName: e.target.value }))}
                    placeholder="Leave blank if same as character name"
                  />
                </div>
              </div>

              {/* Logs & Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Logs & Experience</h3>

                <div className="space-y-2">
                  <Label htmlFor="warcraftLogsUrl">Warcraft Logs URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="warcraftLogsUrl"
                      value={formData.warcraftLogsUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, warcraftLogsUrl: e.target.value }))}
                      onBlur={(e) => fetchWclData(e.target.value)}
                      placeholder="https://classic.warcraftlogs.com/character/eu/firemaw/yourname"
                      className="flex-1"
                    />
                    {formData.warcraftLogsUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(formData.warcraftLogsUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {wclLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching parse data...
                    </div>
                  )}
                  {wclError && (
                    <p className="text-sm text-amber-600">{wclError}</p>
                  )}
                  {wclData && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        Logs Found
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Best Avg:</span>{' '}
                          <span className="font-medium">
                            {wclData.bestPerformanceAverage?.toFixed(1) ?? 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Median:</span>{' '}
                          <span className="font-medium">
                            {wclData.medianPerformanceAverage?.toFixed(1) ?? 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kills:</span>{' '}
                          <span className="font-medium">{wclData.parseCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="raidExperience">Raid Experience & Progression</Label>
                  <Textarea
                    id="raidExperience"
                    value={formData.raidExperience}
                    onChange={(e) => setFormData(prev => ({ ...prev, raidExperience: e.target.value }))}
                    placeholder="Describe your WoW raiding experience, current progression, and any notable accomplishments..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Screenshots */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Screenshots</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gear Screenshot</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      {gearScreenshot ? (
                        <div className="relative">
                          <img
                            src={gearScreenshot}
                            alt="Gear"
                            className="max-h-32 mx-auto rounded"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0"
                            onClick={() => setGearScreenshot(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, setGearScreenshot, setUploadingGear);
                            }}
                            disabled={uploadingGear}
                          />
                          {uploadingGear ? (
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-2">Click to upload</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>UI Screenshot</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      {uiScreenshot ? (
                        <div className="relative">
                          <img
                            src={uiScreenshot}
                            alt="UI"
                            className="max-h-32 mx-auto rounded"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0"
                            onClick={() => setUiScreenshot(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, setUiScreenshot, setUploadingUi);
                            }}
                            disabled={uploadingUi}
                          />
                          {uploadingUi ? (
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-2">Click to upload</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Additional Information</h3>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="availability"
                    checked={formData.availability}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, availability: checked === true }))
                    }
                  />
                  <Label htmlFor="availability" className="text-sm leading-relaxed cursor-pointer">
                    I confirm that I can maintain at least 90% raid attendance (raid times: 21:30-22:00 start)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Anything else you&apos;d like us to know?</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    placeholder="Any additional information, questions, or comments..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || uploadingUi || uploadingGear}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
