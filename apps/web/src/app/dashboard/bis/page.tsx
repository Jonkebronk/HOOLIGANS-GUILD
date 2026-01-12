'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, ExternalLink, Lock, Plus } from 'lucide-react';
import { CLASS_COLORS } from '@hooligans/shared';
import { getSpecIconUrl, getItemIconUrl, refreshWowheadTooltips, ITEM_QUALITY_COLORS } from '@/lib/wowhead';
import { ItemPickerModal } from '@/components/bis/item-picker-modal';
import { useTeam } from '@/components/providers/team-provider';
import { SpecSidebar } from '@/components/bis/spec-sidebar';
import { BisListView } from '@/components/bis/bis-list-view';
import { CLASS_SPECS, getSpecById, getClassColor } from '@/lib/specs';

// WoWSims class background images
const SPEC_BACKGROUNDS: Record<string, string> = {
  DruidBalance: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/balance_druid_background.jpg',
  DruidFeral: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/feral_druid_background.jpg',
  DruidGuardian: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/feral_druid_tank_background.jpg',
  DruidRestoration: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/balance_druid_background.jpg',
  HunterBeastMastery: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  HunterMarksmanship: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  HunterSurvival: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/hunter_background.jpg',
  MageArcane: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  MageFire: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  MageFrost: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/mage_background.jpg',
  PaladinHoly: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  PaladinProtection: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  PaladinRetribution: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/retribution_paladin.jpg',
  PriestDiscipline: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/smite_priest_background.jpg',
  PriestHoly: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/smite_priest_background.jpg',
  PriestShadow: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/shadow_priest_background.jpg',
  RogueAssassination: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  RogueCombat: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  RogueSubtlety: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/rogue_background.jpg',
  ShamanElemental: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/elemental_shaman_background.jpg',
  ShamanEnhancement: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/enhancement_shaman_background.jpg',
  ShamanRestoration: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/elemental_shaman_background.jpg',
  WarlockAffliction: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  WarlockDemonology: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  WarlockDestruction: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warlock_background.jpg',
  WarriorArms: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warrior_background.jpg',
  WarriorFury: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/warrior_background.jpg',
  WarriorProtection: 'https://raw.githubusercontent.com/wowsims/tbc/master/assets/protection_warrior_background.jpg',
};

type Player = {
  id: string;
  name: string;
  class: string;
  mainSpec: string;
};

type BisItem = {
  slot: string;
  itemName: string;
  wowheadId: number | null;
  source: string | null;
  icon: string | null;
  item?: {
    id: string;
    name: string;
    quality: number;
    raid: string;
    boss: string;
  } | null;
};

export default function BisListsPage() {
  const { selectedTeam } = useTeam();
  const [activeTab, setActiveTab] = useState<'presets' | 'player'>('presets');
  const [loading, setLoading] = useState(true);
  const [isOfficer, setIsOfficer] = useState(false);

  // Spec Presets state
  const [selectedSpec, setSelectedSpec] = useState<string>('DruidBalance');
  const [specBisItems, setSpecBisItems] = useState<BisItem[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('P1');

  // Player Lists state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerBisItems, setPlayerBisItems] = useState<BisItem[]>([]);
  const [playerPhase, setPlayerPhase] = useState<string>('P1');

  // Item picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [pickerContext, setPickerContext] = useState<'spec' | 'player'>('spec');

  // Check if user is officer
  useEffect(() => {
    const checkOfficerRole = async () => {
      try {
        const res = await fetch('/api/discord/user-role');
        if (res.ok) {
          const data = await res.json();
          setIsOfficer(data.isOfficer || data.isAdmin || data.isGM);
        }
      } catch (error) {
        console.error('Failed to check officer role:', error);
      }
    };
    checkOfficerRole();
  }, []);

  // Fetch players for Player Lists tab
  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers();
    }
  }, [selectedTeam]);

  const fetchPlayers = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/players?teamId=${selectedTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch spec BiS config
  const fetchSpecBis = useCallback(async (spec: string, phase: string) => {
    try {
      const res = await fetch(`/api/bis?spec=${encodeURIComponent(spec)}&phase=${phase}`);
      if (res.ok) {
        const data = await res.json();
        setSpecBisItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch spec BiS:', error);
    }
  }, []);

  // Fetch player BiS config
  const fetchPlayerBis = useCallback(async (playerId: string, phase: string) => {
    try {
      const res = await fetch(`/api/bis/player?playerId=${playerId}&phase=${phase}`);
      if (res.ok) {
        const data = await res.json();
        setPlayerBisItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch player BiS:', error);
    }
  }, []);

  // Load spec BiS when spec or phase changes
  useEffect(() => {
    if (selectedSpec) {
      fetchSpecBis(selectedSpec, selectedPhase);
    }
  }, [selectedSpec, selectedPhase, fetchSpecBis]);

  // Load player BiS when player or phase changes
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerBis(selectedPlayer.id, playerPhase);
    }
  }, [selectedPlayer, playerPhase, fetchPlayerBis]);

  // Refresh Wowhead tooltips
  useEffect(() => {
    refreshWowheadTooltips();
  }, [specBisItems, playerBisItems]);

  // Handle slot click for spec presets
  const handleSpecSlotClick = (slot: string) => {
    if (!isOfficer) return;
    setSelectedSlot(slot);
    setPickerContext('spec');
    setPickerOpen(true);
  };

  // Handle slot click for player lists
  const handlePlayerSlotClick = (slot: string) => {
    setSelectedSlot(slot);
    setPickerContext('player');
    setPickerOpen(true);
  };

  // Handle item selection from picker (uses database item)
  const handleItemSelect = async (item: { id: string; name: string; wowheadId: number }) => {
    if (pickerContext === 'spec') {
      // Save to spec preset
      const res = await fetch('/api/bis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: selectedSpec,
          phase: selectedPhase,
          slot: selectedSlot,
          itemId: item.id, // Use database item ID for better data
          wowheadId: item.wowheadId,
          itemName: item.name,
        }),
      });
      if (res.ok) {
        fetchSpecBis(selectedSpec, selectedPhase);
      }
    } else if (selectedPlayer) {
      // Save to player custom BiS
      const res = await fetch('/api/bis/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          phase: playerPhase,
          slot: selectedSlot,
          itemId: item.id,
          wowheadId: item.wowheadId,
          itemName: item.name,
        }),
      });
      if (res.ok) {
        fetchPlayerBis(selectedPlayer.id, playerPhase);
      }
    }
  };

  // Handle clear slot
  const handleClearSlot = async () => {
    if (pickerContext === 'spec') {
      const params = new URLSearchParams({
        spec: selectedSpec,
        phase: selectedPhase,
        slot: selectedSlot,
      });
      const res = await fetch(`/api/bis?${params}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSpecBis(selectedSpec, selectedPhase);
      }
    } else if (selectedPlayer) {
      const params = new URLSearchParams({
        playerId: selectedPlayer.id,
        phase: playerPhase,
        slot: selectedSlot,
      });
      const res = await fetch(`/api/bis/player?${params}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPlayerBis(selectedPlayer.id, playerPhase);
      }
    }
    setPickerOpen(false);
  };

  // Copy spec preset to player list
  const handleCopyFromPreset = async () => {
    if (!selectedPlayer) return;

    // Fetch the spec preset for the player's spec
    const spec = selectedPlayer.mainSpec;
    const res = await fetch(`/api/bis?spec=${encodeURIComponent(spec)}&phase=${playerPhase}`);
    if (!res.ok) return;

    const presetItems: BisItem[] = await res.json();

    // Copy each item to the player's custom list
    for (const item of presetItems) {
      if (item.wowheadId) {
        await fetch('/api/bis/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: selectedPlayer.id,
            phase: playerPhase,
            slot: item.slot,
            wowheadId: item.wowheadId,
            itemName: item.itemName,
          }),
        });
      }
    }

    fetchPlayerBis(selectedPlayer.id, playerPhase);
  };

  const specData = getSpecById(selectedSpec);
  const backgroundUrl = selectedSpec ? SPEC_BACKGROUNDS[selectedSpec] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen -m-6 p-6 transition-all duration-500"
      style={{
        backgroundImage: backgroundUrl
          ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${backgroundUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BiS Lists</h1>
          <p className="text-muted-foreground">Best in Slot gear by spec and phase</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://tbc.wowhead.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              TBC DB
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://www.wowsims.com/tbc/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              WoWSims
            </a>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'player')}>
        <TabsList className="mb-6">
          <TabsTrigger value="presets">Spec Presets</TabsTrigger>
          <TabsTrigger value="player">Player Lists</TabsTrigger>
        </TabsList>

        {/* Spec Presets Tab */}
        <TabsContent value="presets">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Spec Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Specs</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[700px] overflow-y-auto">
                <SpecSidebar
                  selectedSpec={selectedSpec}
                  onSelectSpec={setSelectedSpec}
                />
              </CardContent>
            </Card>

            {/* BiS List */}
            <div className="lg:col-span-3 space-y-4">
              {/* Spec Header */}
              {specData && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={getSpecIconUrl(selectedSpec, specData.class)}
                        alt={specData.name}
                        className="w-14 h-14 rounded-lg"
                        style={{ borderColor: getClassColor(specData.class), borderWidth: 3 }}
                      />
                      <div>
                        <h2
                          className="text-xl font-bold"
                          style={{ color: getClassColor(specData.class) }}
                        >
                          {specData.name} {specData.class}
                        </h2>
                        <p className="text-sm text-muted-foreground">{specData.role}</p>
                      </div>
                      {!isOfficer && (
                        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Officers only</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Phase Tabs & BiS List */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      BiS List
                    </CardTitle>
                    <div className="flex gap-2">
                      {['P1', 'P2', 'P3', 'P4', 'P5'].map((phase) => (
                        <Button
                          key={phase}
                          variant={selectedPhase === phase ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-3"
                          onClick={() => setSelectedPhase(phase)}
                        >
                          {phase}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <BisListView
                    items={specBisItems}
                    onSlotClick={handleSpecSlotClick}
                    editable={isOfficer}
                    emptyMessage={
                      isOfficer
                        ? 'Click on a slot to set the BiS item for this spec.'
                        : 'No BiS items configured for this spec yet.'
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Player Lists Tab */}
        <TabsContent value="player">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Player Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">My Characters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[700px] overflow-y-auto">
                {players.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No characters found</p>
                  </div>
                ) : (
                  players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-3 ${
                        selectedPlayer?.id === player.id
                          ? 'bg-primary/20 border border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <img
                        src={getSpecIconUrl(player.mainSpec, player.class)}
                        alt={player.mainSpec}
                        className="w-8 h-8 rounded"
                        style={{ borderColor: CLASS_COLORS[player.class], borderWidth: 2 }}
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          style={{ color: CLASS_COLORS[player.class] }}
                          className="font-medium truncate block"
                        >
                          {player.name}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {player.mainSpec?.replace(player.class, '')}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Player BiS List */}
            <div className="lg:col-span-3 space-y-4">
              {selectedPlayer ? (
                <>
                  {/* Player Header */}
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={getSpecIconUrl(selectedPlayer.mainSpec, selectedPlayer.class)}
                          alt={selectedPlayer.mainSpec}
                          className="w-14 h-14 rounded-lg"
                          style={{ borderColor: CLASS_COLORS[selectedPlayer.class], borderWidth: 3 }}
                        />
                        <div>
                          <h2
                            className="text-xl font-bold"
                            style={{ color: CLASS_COLORS[selectedPlayer.class] }}
                          >
                            {selectedPlayer.name}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {selectedPlayer.mainSpec?.replace(selectedPlayer.class, '')} {selectedPlayer.class}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <Button variant="outline" size="sm" onClick={handleCopyFromPreset}>
                            <Plus className="h-4 w-4 mr-2" />
                            Copy from Spec Preset
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Phase Tabs & BiS List */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Custom BiS List
                        </CardTitle>
                        <div className="flex gap-2">
                          {['P1', 'P2', 'P3', 'P4', 'P5'].map((phase) => (
                            <Button
                              key={phase}
                              variant={playerPhase === phase ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 px-3"
                              onClick={() => setPlayerPhase(phase)}
                            >
                              {phase}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <BisListView
                        items={playerBisItems}
                        onSlotClick={handlePlayerSlotClick}
                        editable={true}
                        emptyMessage="Click on a slot to set your custom BiS item, or copy from the spec preset."
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a Character</h3>
                      <p className="text-muted-foreground">
                        Choose a character from the sidebar to view or edit their custom BiS list.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Picker Modal - uses local items database */}
      <ItemPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        slot={selectedSlot}
        slotLabel={selectedSlot.replace(/([A-Z])/g, ' $1').trim()}
        onSelectItem={handleItemSelect}
        onClear={handleClearSlot}
      />
    </div>
  );
}
