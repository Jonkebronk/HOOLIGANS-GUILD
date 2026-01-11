'use client';

import { useState } from 'react';
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
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

type ParsedItem = {
  session: number;
  itemName: string;
  itemId: number;
  ilvl: number;
  quality: number;
};

type RCImportDialogProps = {
  onImport: (items: ParsedItem[]) => Promise<void>;
};

// Parse WoW item link color code to quality
// |cff9d9d9d = Poor (0)
// |cffffffff = Common (1)
// |cff1eff00 = Uncommon (2)
// |cff0070dd = Rare (3)
// |cffa335ee = Epic (4)
// |cffff8000 = Legendary (5)
const COLOR_TO_QUALITY: Record<string, number> = {
  '9d9d9d': 0, // Poor
  'ffffff': 1, // Common
  '1eff00': 2, // Uncommon
  '0070dd': 3, // Rare
  'a335ee': 4, // Epic
  'ff8000': 5, // Legendary
};

function parseRCLootCouncilExport(text: string): ParsedItem[] {
  const lines = text.trim().split('\n');
  const items: ParsedItem[] = [];

  for (const line of lines) {
    // Skip header line
    if (line.startsWith('session,item,itemID,ilvl')) continue;
    if (!line.trim()) continue;

    // Parse CSV format: session,item,itemID,ilvl
    // Example: 1,|cffa335ee|Hitem:17076::::::::60::::::::::|h[Bonereaver's Edge]|h|r,17076,77
    const match = line.match(/^(\d+),\|cff([a-f0-9]{6})\|Hitem:(\d+).*?\|h\[(.+?)\]\|h\|r,(\d+),(\d+)/i);

    if (match) {
      const [, sessionStr, colorCode, , itemName, itemIdStr, ilvlStr] = match;
      items.push({
        session: parseInt(sessionStr),
        itemName,
        itemId: parseInt(itemIdStr),
        ilvl: parseInt(ilvlStr),
        quality: COLOR_TO_QUALITY[colorCode.toLowerCase()] ?? 4,
      });
    }
  }

  return items;
}

export function RCImportDialog({ onImport }: RCImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleTextChange = (text: string) => {
    setImportText(text);
    setError('');

    if (text.trim()) {
      const items = parseRCLootCouncilExport(text);
      setParsedItems(items);

      if (items.length === 0 && text.includes(',')) {
        setError('Could not parse any items. Make sure you copied the full export from RCLootCouncil.');
      }
    } else {
      setParsedItems([]);
    }
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;

    setIsImporting(true);
    setError('');

    try {
      await onImport(parsedItems);
      setOpen(false);
      setImportText('');
      setParsedItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import items');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import RC
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from RCLootCouncil</DialogTitle>
          <DialogDescription>
            Paste the export from RCLootCouncil addon. Open RCLootCouncil in-game, go to History,
            select items, and click Export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Paste Export Data</Label>
            <Textarea
              placeholder={`session,item,itemID,ilvl
1,|cffa335ee|Hitem:17076::::::::60::::::::::|h[Bonereaver's Edge]|h|r,17076,77
2,|cffa335ee|Hitem:19148::::::::60::::::::::|h[Dark Iron Helm]|h|r,19148,66`}
              value={importText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="font-mono text-xs h-40"
            />
          </div>

          {parsedItems.length > 0 && (
            <div className="rounded-lg border border-border p-3 bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-green-500 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Found {parsedItems.length} item(s)
              </div>
              <div className="max-h-32 overflow-auto">
                <ul className="text-xs space-y-1">
                  {parsedItems.slice(0, 10).map((item, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="text-purple-400">{item.itemName}</span>
                      <span className="ml-2">(ID: {item.itemId}, ilvl: {item.ilvl})</span>
                    </li>
                  ))}
                  {parsedItems.length > 10 && (
                    <li className="text-muted-foreground">
                      ... and {parsedItems.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedItems.length === 0 || isImporting}>
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isImporting ? 'Importing...' : `Import ${parsedItems.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
