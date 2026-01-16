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

type ParsedResponse = {
  player: string;
  class: string;
  response: string;
  note?: string;
};

type ParsedItem = {
  itemName: string;
  wowheadId: number;
  ilvl: number;
  quality: number;
  boss?: string;
  timestamp?: number;
  responses?: ParsedResponse[];
};

type HooligansLootExport = {
  items: Array<{
    itemName: string;
    wowheadId: number;
    quality: number;
    ilvl: number;
    boss?: string;
    timestamp?: number;
    responses?: Array<{
      player: string;
      class: string;
      response: string;
      note?: string;
    }>;
  }>;
  teamId?: string;
};

type RCImportDialogProps = {
  onImport: (items: ParsedItem[]) => Promise<void>;
};

function parseHooligansLootExport(text: string): ParsedItem[] {
  try {
    const data: HooligansLootExport = JSON.parse(text);

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item) => {
      // Handle responses being either an array or an empty object {}
      const responses = Array.isArray(item.responses) ? item.responses : [];

      return {
        itemName: item.itemName,
        wowheadId: item.wowheadId,
        quality: item.quality,
        ilvl: item.ilvl,
        boss: item.boss,
        timestamp: item.timestamp,
        responses: responses.map((r) => ({
          player: r.player,
          class: r.class,
          response: r.response,
          note: r.note || '',
        })),
      };
    });
  } catch {
    return [];
  }
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
      const items = parseHooligansLootExport(text);
      setParsedItems(items);

      if (items.length === 0) {
        setError('Could not parse any items. Make sure you copied the full JSON export from HooligansLoot addon.');
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
          <DialogTitle>Import from HooligansLoot Addon</DialogTitle>
          <DialogDescription>
            Paste the JSON export from the HooligansLoot addon. Use /hlexport in-game to generate the data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Paste Export Data</Label>
            <Textarea
              placeholder={`{
  "items": [
    {
      "itemName": "Helm of the Fallen Hero",
      "wowheadId": 29759,
      "quality": 4,
      "ilvl": 70,
      "boss": "Prince Malchezaar"
    }
  ]
}`}
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
                      <span className="ml-2">(ilvl: {item.ilvl})</span>
                      {item.responses && item.responses.length > 0 && (
                        <span className="ml-2 text-green-400">
                          {item.responses.length} vote{item.responses.length !== 1 ? 's' : ''}
                        </span>
                      )}
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
