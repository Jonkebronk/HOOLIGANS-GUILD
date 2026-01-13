'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Sparkles, RefreshCw, ArrowDown, Sun } from 'lucide-react';
import { CLASS_COLORS, TOKEN_TYPES } from '@hooligans/shared';
import { getItemIconUrl, refreshWowheadTooltips, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

type TierTokenPiece = {
  id: string;
  className: string;
  pieceName: string;
  pieceItem?: {
    id: string;
    name: string;
    wowheadId: number;
    icon: string;
    quality: number;
  } | null;
};

type TierToken = {
  id: string;
  name: string;
  wowheadId: number | null;
  icon: string | null;
  tokenType: string;
  tier: string;
  slot: string;
  boss: string | null;
  raid: string | null;
  phase: string;
  linkedPieces: TierTokenPiece[];
};

type SunmoteUpgrade = {
  id: string;
  baseItemName: string;
  baseWowheadId: number | null;
  baseIcon: string | null;
  upgradedName: string;
  upgradedWowheadId: number | null;
  upgradedIcon: string | null;
  sunmotesRequired: number;
  slot: string;
  armorType: string | null;
};

const TIERS = ['T4', 'T5', 'T6'];
const TOKEN_TYPE_NAMES = Object.keys(TOKEN_TYPES);
const ARMOR_TYPES = ['Cloth', 'Leather', 'Mail', 'Plate'];
const SLOTS = ['Chest', 'Legs', 'Wrist', 'Waist'];

const ARMOR_COLORS: Record<string, string> = {
  Cloth: '#9370DB',
  Leather: '#8B4513',
  Mail: '#4682B4',
  Plate: '#C0C0C0',
};

export default function TokensPage() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'sunmotes'>('tokens');

  // Tier Tokens state
  const [tokens, setTokens] = useState<TierToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [seedingTokens, setSeedingTokens] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TierToken | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Sunmotes state
  const [upgrades, setUpgrades] = useState<SunmoteUpgrade[]>([]);
  const [upgradesLoading, setUpgradesLoading] = useState(true);
  const [seedingSunmotes, setSeedingSunmotes] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<SunmoteUpgrade | null>(null);
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [armorFilter, setArmorFilter] = useState<string>('all');

  // Fetch tier tokens
  const fetchTokens = async () => {
    try {
      const params = new URLSearchParams();
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (typeFilter !== 'all') params.set('tokenType', typeFilter);

      const res = await fetch(`/api/tokens?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
        if (data.length > 0 && !selectedToken) {
          setSelectedToken(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setTokensLoading(false);
    }
  };

  // Fetch sunmote upgrades
  const fetchUpgrades = async () => {
    try {
      const params = new URLSearchParams();
      if (slotFilter !== 'all') params.set('slot', slotFilter);
      if (armorFilter !== 'all') params.set('armorType', armorFilter);

      const res = await fetch(`/api/sunmotes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUpgrades(data);
        if (data.length > 0 && !selectedUpgrade) {
          setSelectedUpgrade(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch upgrades:', error);
    } finally {
      setUpgradesLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [tierFilter, typeFilter]);

  useEffect(() => {
    fetchUpgrades();
  }, [slotFilter, armorFilter]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedToken, selectedUpgrade]);

  const handleSeedTokens = async () => {
    setSeedingTokens(true);
    try {
      const res = await fetch('/api/tokens/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.message}`);
        fetchTokens();
      } else {
        alert('Failed to seed tokens');
      }
    } catch (error) {
      console.error('Failed to seed tokens:', error);
      alert('Failed to seed tokens');
    } finally {
      setSeedingTokens(false);
    }
  };

  const handleSeedSunmotes = async () => {
    setSeedingSunmotes(true);
    try {
      const res = await fetch('/api/sunmotes/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.message}`);
        fetchUpgrades();
      } else {
        alert('Failed to seed sunmote upgrades');
      }
    } catch (error) {
      console.error('Failed to seed sunmote upgrades:', error);
      alert('Failed to seed sunmote upgrades');
    } finally {
      setSeedingSunmotes(false);
    }
  };

  // Group tokens by slot for sidebar
  const tokensBySlot = tokens.reduce((acc, token) => {
    if (!acc[token.slot]) acc[token.slot] = [];
    acc[token.slot].push(token);
    return acc;
  }, {} as Record<string, TierToken[]>);

  const slotOrder = ['Head', 'Shoulder', 'Chest', 'Hands', 'Legs'];

  // Group upgrades by armor type for sidebar
  const upgradesByArmor = upgrades.reduce((acc, upgrade) => {
    const armor = upgrade.armorType || 'Unknown';
    if (!acc[armor]) acc[armor] = [];
    acc[armor].push(upgrade);
    return acc;
  }, {} as Record<string, SunmoteUpgrade[]>);

  const loading = activeTab === 'tokens' ? tokensLoading : upgradesLoading;

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tokens & Upgrades</h1>
          <p className="text-muted-foreground">View tier tokens and Sunmote upgrades</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tokens' | 'sunmotes')}>
        <TabsList>
          <TabsTrigger value="tokens">Tier Tokens</TabsTrigger>
          <TabsTrigger value="sunmotes">Sunmotes</TabsTrigger>
        </TabsList>

        {/* Tier Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tier:</span>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Token:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TOKEN_TYPE_NAMES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setTierFilter('all'); setTypeFilter('all'); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <div className="flex-1" />
                <Button onClick={handleSeedTokens} disabled={seedingTokens} variant="outline">
                  {seedingTokens ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {seedingTokens ? 'Seeding...' : 'Seed Tokens'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {tokens.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tokens Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Seed Tokens" to populate all TBC tier tokens.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Token Sidebar */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tokens ({tokens.length})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto space-y-4">
                  {slotOrder.map((slot) => {
                    const slotTokens = tokensBySlot[slot];
                    if (!slotTokens) return null;
                    return (
                      <div key={slot}>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          {slot}
                        </div>
                        <div className="space-y-1">
                          {slotTokens.map((token) => (
                            <button
                              key={token.id}
                              onClick={() => setSelectedToken(token)}
                              className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                                selectedToken?.id === token.id
                                  ? 'bg-primary/20 border border-primary'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              {token.wowheadId && (
                                <img
                                  src={getItemIconUrl(token.icon || 'inv_misc_questionmark', 'small')}
                                  alt=""
                                  className="w-6 h-6 rounded"
                                  style={{ borderColor: ITEM_QUALITY_COLORS[4], borderWidth: 1, borderStyle: 'solid' }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{token.tier}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {token.tokenType}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Token Details */}
              <div className="lg:col-span-3 space-y-4">
                {selectedToken ? (
                  <>
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          {selectedToken.wowheadId ? (
                            <a
                              href={`https://www.wowhead.com/tbc/item=${selectedToken.wowheadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-wh-icon-size="0"
                            >
                              <img
                                src={getItemIconUrl(selectedToken.icon || 'inv_misc_questionmark', 'large')}
                                alt={selectedToken.name}
                                className="w-14 h-14 rounded-lg"
                                style={{ borderColor: ITEM_QUALITY_COLORS[4], borderWidth: 3, borderStyle: 'solid' }}
                              />
                            </a>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <a
                              href={selectedToken.wowheadId ? `https://www.wowhead.com/tbc/item=${selectedToken.wowheadId}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-wh-icon-size="0"
                              className="text-xl font-bold hover:underline"
                              style={{ color: ITEM_QUALITY_COLORS[4] }}
                            >
                              {selectedToken.name}
                            </a>
                            <p className="text-sm text-muted-foreground">
                              {selectedToken.tier} • {selectedToken.slot} • {selectedToken.phase}
                            </p>
                            {selectedToken.boss && selectedToken.raid && (
                              <p className="text-sm text-muted-foreground">
                                Drops from: {selectedToken.boss} in {selectedToken.raid}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Linked Gear Pieces</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {selectedToken.linkedPieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="p-3 rounded-lg bg-muted/50 border"
                              style={{ borderColor: CLASS_COLORS[piece.className] || '#888' }}
                            >
                              <div
                                className="font-medium text-sm"
                                style={{ color: CLASS_COLORS[piece.className] || '#888' }}
                              >
                                {piece.className}
                              </div>
                              <div className="text-sm text-foreground mt-1">
                                {piece.pieceName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select a Token</h3>
                        <p className="text-muted-foreground">
                          Choose a token from the sidebar to view its linked gear pieces.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sunmotes Tab */}
        <TabsContent value="sunmotes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Slot:</span>
                  <Select value={slotFilter} onValueChange={setSlotFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Armor:</span>
                  <Select value={armorFilter} onValueChange={setArmorFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {ARMOR_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSlotFilter('all'); setArmorFilter('all'); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <div className="flex-1" />
                <Button onClick={handleSeedSunmotes} disabled={seedingSunmotes} variant="outline">
                  {seedingSunmotes ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sun className="h-4 w-4 mr-2" />
                  )}
                  {seedingSunmotes ? 'Seeding...' : 'Seed Sunmotes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {upgrades.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Sun className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sunmote Upgrades Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Seed Sunmotes" to populate all Sunwell upgrade paths.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Upgrade Sidebar */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Upgrades ({upgrades.length})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto space-y-4">
                  {ARMOR_TYPES.map((armor) => {
                    const armorUpgrades = upgradesByArmor[armor];
                    if (!armorUpgrades) return null;
                    return (
                      <div key={armor}>
                        <div
                          className="text-xs font-medium uppercase tracking-wide mb-2"
                          style={{ color: ARMOR_COLORS[armor] }}
                        >
                          {armor}
                        </div>
                        <div className="space-y-1">
                          {armorUpgrades.map((upgrade) => (
                            <button
                              key={upgrade.id}
                              onClick={() => setSelectedUpgrade(upgrade)}
                              className={`w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2 ${
                                selectedUpgrade?.id === upgrade.id
                                  ? 'bg-primary/20 border border-primary'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <img
                                src={getItemIconUrl(upgrade.baseIcon || 'inv_misc_questionmark', 'small')}
                                alt=""
                                className="w-6 h-6 rounded flex-shrink-0"
                                style={{ borderColor: ITEM_QUALITY_COLORS[4], borderWidth: 1, borderStyle: 'solid' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{upgrade.baseItemName}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {upgrade.slot}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Upgrade Details */}
              <div className="lg:col-span-3 space-y-4">
                {selectedUpgrade ? (
                  <Card>
                    <CardContent className="py-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        {/* Base Item */}
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Base Item</p>
                          <a
                            href={selectedUpgrade.baseWowheadId ? `https://www.wowhead.com/tbc/item=${selectedUpgrade.baseWowheadId}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                          >
                            <img
                              src={getItemIconUrl(selectedUpgrade.baseIcon || 'inv_misc_questionmark', 'large')}
                              alt={selectedUpgrade.baseItemName}
                              className="w-14 h-14 rounded-lg mb-2"
                              style={{ borderColor: ITEM_QUALITY_COLORS[4], borderWidth: 3, borderStyle: 'solid' }}
                            />
                          </a>
                          <a
                            href={selectedUpgrade.baseWowheadId ? `https://www.wowhead.com/tbc/item=${selectedUpgrade.baseWowheadId}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                            className="text-lg font-bold hover:underline"
                            style={{ color: ITEM_QUALITY_COLORS[4] }}
                          >
                            {selectedUpgrade.baseItemName}
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {selectedUpgrade.slot} • {selectedUpgrade.armorType}
                          </p>
                        </div>

                        {/* Arrow + Sunmote */}
                        <div className="flex items-center gap-2 text-yellow-500">
                          <ArrowDown className="h-6 w-6" />
                          <span className="text-sm font-medium">+ {selectedUpgrade.sunmotesRequired} Sunmote</span>
                        </div>

                        {/* Upgraded Item */}
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Upgraded Item</p>
                          <a
                            href={selectedUpgrade.upgradedWowheadId ? `https://www.wowhead.com/tbc/item=${selectedUpgrade.upgradedWowheadId}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                          >
                            <img
                              src={getItemIconUrl(selectedUpgrade.upgradedIcon || 'inv_misc_questionmark', 'large')}
                              alt={selectedUpgrade.upgradedName}
                              className="w-14 h-14 rounded-lg mb-2"
                              style={{ borderColor: ITEM_QUALITY_COLORS[5], borderWidth: 3, borderStyle: 'solid' }}
                            />
                          </a>
                          <a
                            href={selectedUpgrade.upgradedWowheadId ? `https://www.wowhead.com/tbc/item=${selectedUpgrade.upgradedWowheadId}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-wh-icon-size="0"
                            className="text-lg font-bold hover:underline"
                            style={{ color: ITEM_QUALITY_COLORS[5] }}
                          >
                            {selectedUpgrade.upgradedName}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Sun className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Select an Upgrade</h3>
                        <p className="text-muted-foreground">
                          Choose an upgrade from the sidebar to view the transformation.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
