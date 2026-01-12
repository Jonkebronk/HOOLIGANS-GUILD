'use client';

import { getItemIconUrl, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

type BisItem = {
  slot: string;
  itemName: string;
  wowheadId: number | null;
  source: string | null;
  icon: string | null;
  item?: {
    quality: number;
    raid: string;
    boss: string;
  } | null;
};

// Slot display order and names
const SLOT_ORDER = [
  'Head',
  'Neck',
  'Shoulder',
  'Back',
  'Chest',
  'Wrist',
  'Hands',
  'Waist',
  'Legs',
  'Feet',
  'Finger1',
  'Finger2',
  'Trinket1',
  'Trinket2',
  'MainHand',
  'OffHand',
  'Ranged',
];

const SLOT_DISPLAY_NAMES: Record<string, string> = {
  Head: 'Head',
  Neck: 'Neck',
  Shoulder: 'Shoulders',
  Back: 'Back',
  Chest: 'Chest',
  Wrist: 'Wrists',
  Hands: 'Hands',
  Waist: 'Waist',
  Legs: 'Legs',
  Feet: 'Feet',
  Finger1: 'Ring 1',
  Finger2: 'Ring 2',
  Trinket1: 'Trinket 1',
  Trinket2: 'Trinket 2',
  MainHand: 'Main Hand',
  OffHand: 'Off Hand',
  Ranged: 'Ranged',
};

type BisListViewProps = {
  items: BisItem[];
  onSlotClick?: (slot: string) => void;
  editable?: boolean;
  emptyMessage?: string;
};

export function BisListView({
  items,
  onSlotClick,
  editable = false,
  emptyMessage = 'No BiS items configured for this phase.',
}: BisListViewProps) {
  // Create a map of items by slot
  const itemsBySlot = new Map(items.map(item => [item.slot, item]));

  return (
    <div className="space-y-1">
      {SLOT_ORDER.map((slot) => {
        const item = itemsBySlot.get(slot);
        const iconUrl = item?.icon
          ? getItemIconUrl(item.icon, 'small')
          : getItemIconUrl('inv_misc_questionmark', 'small');
        const quality = item?.item?.quality ?? 4; // Default to epic
        const qualityColor = ITEM_QUALITY_COLORS[quality] || ITEM_QUALITY_COLORS[4];

        const handleSlotClick = (e: React.MouseEvent) => {
          if (editable) {
            e.preventDefault();
            e.stopPropagation();
            onSlotClick?.(slot);
          }
        };

        return (
          <div
            key={slot}
            onClick={handleSlotClick}
            className={`flex items-center gap-3 p-2 rounded border border-border/50 ${
              editable ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''
            } ${!item ? 'opacity-50' : ''}`}
          >
            {/* Item icon */}
            {item?.wowheadId && !editable ? (
              <a
                href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                target="_blank"
                rel="noopener noreferrer"
                data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={iconUrl}
                  alt={item.itemName}
                  className="w-8 h-8 rounded"
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: qualityColor,
                  }}
                />
              </a>
            ) : (
              <div
                className="flex-shrink-0"
                data-wowhead={item?.wowheadId ? `item=${item.wowheadId}&domain=tbc` : undefined}
              >
                <img
                  src={iconUrl}
                  alt={item?.itemName || slot}
                  className="w-8 h-8 rounded"
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: item ? qualityColor : '#666',
                  }}
                />
              </div>
            )}

            {/* Item name and slot */}
            <div className="flex-1 min-w-0">
              {item ? (
                item.wowheadId && !editable ? (
                  <a
                    href={`https://www.wowhead.com/tbc/item=${item.wowheadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wowhead={`item=${item.wowheadId}&domain=tbc`}
                    className="text-sm font-medium hover:underline block truncate"
                    style={{ color: qualityColor }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.itemName}
                  </a>
                ) : (
                  <span
                    className="text-sm font-medium block truncate"
                    style={{ color: qualityColor }}
                    data-wowhead={item.wowheadId ? `item=${item.wowheadId}&domain=tbc` : undefined}
                  >
                    {item.itemName}
                  </span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">
                  {editable ? 'Click to set item' : 'Not configured'}
                </span>
              )}
              {item?.source && (
                <span className="text-xs text-muted-foreground block truncate">
                  {item.source}
                </span>
              )}
            </div>

            {/* Slot name */}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
              {SLOT_DISPLAY_NAMES[slot] || slot}
            </span>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
