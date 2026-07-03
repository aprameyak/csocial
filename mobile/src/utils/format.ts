import { formatDistanceToNow, format } from 'date-fns';
import { ResultLabels } from '../constants/theme';
import type { ClimbResult, WallAngle } from '../types/api';

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatShortDate(date: string | Date): string {
  return format(new Date(date), 'MMM d');
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatResult(result: ClimbResult): string {
  return ResultLabels[result] ?? result;
}

export function formatWallAngle(angle: WallAngle): string {
  const labels: Record<WallAngle, string> = {
    SLAB: 'Slab',
    VERTICAL: 'Vertical',
    SLIGHT_OVERHANG: 'Slight Overhang',
    OVERHANG: 'Overhang',
    STEEP: 'Steep',
    ROOF: 'Roof',
  };
  return labels[angle] ?? angle;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  const pluralForm = plural ?? `${singular}s`;
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function gradeToNumber(grade: string): number {
  if (grade === 'VB') return -1;
  const n = parseInt(grade.replace('V', ''), 10);
  return isNaN(n) ? -1 : n;
}
