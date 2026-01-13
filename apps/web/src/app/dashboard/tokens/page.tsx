'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Sparkles, RefreshCw } from 'lucide-react';
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

const TIERS = ['T4', 'T5', 'T6'];
const TOKEN_TYPE_NAMES = Object.keys(TOKEN_TYPES);

export default function TokensPage() {
  const [tokens, setTokens] = useState<TierToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TierToken | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [tierFilter, typeFilter]);

  useEffect(() => {
    refreshWowheadTooltips();
  }, [selectedToken]);

  const handleSeedTokens = async () => {
    setSeeding(true);
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
      setSeeding(false);
    }
  };

  // Group tokens by slot for sidebar
  const tokensBySlot = tokens.reduce((acc, token) => {
    if (!acc[token.slot]) acc[token.slot] = [];
    acc[token.slot].push(token);
    return acc;
  }, {} as Record<string, TierToken[]>);

  const slotOrder = ['Head', 'Shoulder', 'Chest', 'Hands', 'Legs'];

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
          <h1 className="text-2xl font-bold">Tier Tokens</h1>
          <p className="text-muted-foreground">View tier tokens and their linked gear pieces</p>
        </div>
        <Button onClick={handleSeedTokens} disabled={seeding} variant="outline">
          {seeding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {seeding ? 'Seeding...' : 'Seed Tokens'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
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
                {/* Token Header */}
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

                {/* Linked Pieces */}
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
                          {piece.pieceItem && (
                            <a
                              href={`https://www.wowhead.com/tbc/item=${piece.pieceItem.wowheadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:underline mt-1 block"
                            >
                              View on Wowhead
                            </a>
                          )}
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
    </div>
  );
}
