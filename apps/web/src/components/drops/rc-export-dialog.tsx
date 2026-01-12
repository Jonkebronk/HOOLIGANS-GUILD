'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, Copy, Check, AlertCircle } from 'lucide-react';

type LootItem = {
  id: string;
  itemId?: string;
  itemName: string;
  wowheadId?: number;
  quality?: number;
  icon?: string;
  playerId?: string;
  playerName?: string;
  playerClass?: string;
  response?: string;
  lootDate?: string;
  lootPrio?: string;
};

type RCExportDialogProps = {
  items: LootItem[];
};

// Map quality to WoW color codes for item links
const QUALITY_TO_COLOR: Record<number, string> = {
  0: '9d9d9d', // Poor
  1: 'ffffff', // Common
  2: '1eff00', // Uncommon
  3: '0070dd', // Rare
  4: 'a335ee', // Epic
  5: 'ff8000', // Legendary
};

// Map response types to RCLootCouncil response IDs
const RESPONSE_TO_ID: Record<string, number> = {
  BiS: 1,
  GreaterUpgrade: 2,
  MinorUpgrade: 3,
  Offspec: 4,
  PvP: 5,
  Disenchant: 6,
};

function generateItemLink(item: LootItem): string {
  const colorCode = QUALITY_TO_COLOR[item.quality || 4];
  const itemId = item.wowheadId || 0;
  // Format: |cffCOLOR|Hitem:ITEMID::::::::LEVEL:::::::::|h[NAME]|h|r
  return `|cff${colorCode}|Hitem:${itemId}::::::::70:::::::::|h[${item.itemName}]|h|r`;
}

// Map WoW class names to uppercase format expected by RCLootCouncil
const CLASS_NAME_MAP: Record<string, string> = {
  Druid: 'DRUID',
  Hunter: 'HUNTER',
  Mage: 'MAGE',
  Paladin: 'PALADIN',
  Priest: 'PRIEST',
  Rogue: 'ROGUE',
  Shaman: 'SHAMAN',
  Warlock: 'WARLOCK',
  Warrior: 'WARRIOR',
};

function formatDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2); // Last 2 digits only
  return `${day}/${month}/${year}`;
}

function formatTime(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

function generateCSVExport(items: LootItem[]): string {
  // Filter to only items with player assignments
  const assignedItems = items.filter((item) => item.playerId && item.playerName);

  if (assignedItems.length === 0) {
    return '';
  }

  // CSV header matching RCLootCouncil import format exactly (with spaces after commas)
  const header =
    'player, date, time, id, item, itemID, itemString, response, votes, class, instance, boss, difficultyID, mapID, groupSize, gear1, gear2, responseID, isAwardReason, subType, equipLoc, note, owner';

  const rows = assignedItems.map((item) => {
    const date = formatDate(item.lootDate);
    const time = formatTime(item.lootDate);
    const itemLink = generateItemLink(item);
    const itemId = item.wowheadId || 0;
    const itemString = `item:${itemId}:0:0:0:0:0:0:0`;
    const response = item.response || 'Award';
    const responseId = RESPONSE_TO_ID[item.response || ''] || 0;
    const playerClass = CLASS_NAME_MAP[item.playerClass || ''] || '';

    return [
      item.playerName, // player
      date, // date (dd/mm/yy)
      time, // time (hh:mm:ss)
      '', // id (leave empty, addon generates it)
      itemLink, // item (item link)
      itemId, // itemID
      itemString, // itemString
      response, // response
      0, // votes
      playerClass, // class (UPPERCASE)
      '', // instance
      '', // boss
      '', // difficultyID
      '', // mapID
      25, // groupSize
      '', // gear1
      '', // gear2
      responseId, // responseID
      'false', // isAwardReason
      '', // subType
      '', // equipLoc
      '', // note
      '', // owner
    ].join(', ');
  });

  return [header, ...rows].join('\n');
}

// Simpler "Player Export" format - just player names with items
function generatePlayerExport(items: LootItem[]): string {
  const assignedItems = items.filter((item) => item.playerId && item.playerName);

  if (assignedItems.length === 0) {
    return '';
  }

  // Group by player
  const byPlayer: Record<string, LootItem[]> = {};
  for (const item of assignedItems) {
    const name = item.playerName!;
    if (!byPlayer[name]) byPlayer[name] = [];
    byPlayer[name].push(item);
  }

  const lines: string[] = [];
  for (const [player, playerItems] of Object.entries(byPlayer)) {
    for (const item of playerItems) {
      lines.push(`${player}-${item.wowheadId || item.itemName}`);
    }
  }

  return lines.join('\n');
}

export function RCExportDialog({ items }: RCExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'player'>('csv');

  const assignedCount = useMemo(
    () => items.filter((item) => item.playerId && item.playerName).length,
    [items]
  );

  const exportData = useMemo(() => {
    if (exportType === 'csv') {
      return generateCSVExport(items);
    }
    return generatePlayerExport(items);
  }, [items, exportType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rclootcouncil-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={assignedCount === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export RC
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export for RCLootCouncil</DialogTitle>
          <DialogDescription>
            Export your loot assignments to import into RCLootCouncil in-game. Copy the data below
            and paste it into the RCLootCouncil Import window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Type Toggle */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-2">
              <Button
                variant={exportType === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportType('csv')}
              >
                CSV (Full History)
              </Button>
              <Button
                variant={exportType === 'player' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportType('player')}
              >
                Player Export (Simple)
              </Button>
            </div>
          </div>

          {assignedCount === 0 ? (
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              No items have been assigned to players yet.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border p-3 bg-muted/50">
                <div className="text-sm text-green-500 mb-2">
                  {assignedCount} item(s) assigned and ready to export
                </div>
              </div>

              <div className="space-y-2">
                <Label>Export Data</Label>
                <Textarea
                  readOnly
                  value={exportData}
                  className="font-mono text-xs h-48"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={assignedCount === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleCopy} disabled={assignedCount === 0}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
