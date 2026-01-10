'use client';

import { buildWowheadLink, getItemIconUrl, ITEM_QUALITY_COLORS } from '@/lib/wowhead';

interface ItemLinkProps {
  itemId: number;
  itemName: string;
  iconName?: string;
  quality?: number;
  showIcon?: boolean;
  iconSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ItemLink({
  itemId,
  itemName,
  iconName,
  quality = 4, // Epic by default
  showIcon = true,
  iconSize = 'small',
  className = '',
}: ItemLinkProps) {
  const qualityColor = ITEM_QUALITY_COLORS[quality] || ITEM_QUALITY_COLORS[4];
  const href = buildWowheadLink(itemId);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-wowhead={`item=${itemId}&domain=tbc`}
      data-wh-icon-size={iconSize}
      className={`inline-flex items-center gap-1.5 hover:underline ${className}`}
      style={{ color: qualityColor }}
    >
      {showIcon && iconName && (
        <img
          src={getItemIconUrl(iconName, iconSize)}
          alt=""
          className="w-5 h-5 rounded border border-border"
        />
      )}
      <span>{itemName}</span>
    </a>
  );
}
