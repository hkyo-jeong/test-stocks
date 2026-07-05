import type { Period } from './types';

export const INTRADAY_PERIODS: Period[] = ['1m', '5m', '15m'];

export function fmt(num: number | null | undefined): string {
  if (num == null) return '-';
  return num.toLocaleString('ko-KR');
}

export function fmtCap(num: number | null | undefined): string {
  if (num == null) return '-';
  const trillion = 1_000_000_000_000;
  const billion = 100_000_000;
  if (num >= trillion) return `${(num / trillion).toFixed(1)}조`;
  return `${(num / billion).toFixed(0)}억`;
}

export function changeClass(v: number): string {
  return v > 0 ? 'up' : v < 0 ? 'down' : '';
}

export function changeSign(v: number): string {
  return v > 0 ? `+${fmt(v)}` : `${fmt(v)}`;
}

export function defaultCountForPeriod(period: Period): number {
  return INTRADAY_PERIODS.includes(period) ? 100 : 60;
}
