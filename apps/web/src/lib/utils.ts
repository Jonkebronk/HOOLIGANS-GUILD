import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getWowheadIconUrl(itemId: number, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = { small: 'tiny', medium: 'small', large: 'medium' };
  return `https://wow.zamimg.com/images/wow/icons/${sizeMap[size]}/${itemId}.jpg`;
}

export function getWowheadItemUrl(itemId: number): string {
  return `https://classic.wowhead.com/item=${itemId}`;
}

export function getClassColor(className: string): string {
  const colors: Record<string, string> = {
    Druid: '#FF7C0A',
    Hunter: '#AAD372',
    Mage: '#3FC7EB',
    Paladin: '#F48CBA',
    Priest: '#FFFFFF',
    Rogue: '#FFF468',
    Shaman: '#0070DD',
    Warlock: '#8788EE',
    Warrior: '#C69B6D',
  };
  return colors[className] || '#FFFFFF';
}

export function calculateAttendancePercentage(attended: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100);
}

export function getDaysSince(date: Date | string): number {
  const now = new Date();
  const then = new Date(date);
  const diffTime = Math.abs(now.getTime() - then.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
