import type { CSSProperties } from 'react';

const PALETTE: Record<string, string> = {
  cmp: '#f97316',
  focus: '#3b82f6',
  active: '#f97316',
  swap: '#eab308',
  sorted: '#22c55e',
  found: '#22c55e',
  match: '#22c55e',
  path: '#22c55e',
  visited: '#0d9488',
  frontier: '#64748b',
  reject: '#ef4444',
  miss: '#ef4444',
  revert: '#ef4444',
  attack: '#ef4444',
  mismatch: '#ef4444',
  pivot: '#a855f7',
  find: '#3b82f6',
  union: '#a855f7',
  placed: '#3b82f6',
  best: '#f97316',
  highlight: '#eab308',
  tmp: '#f97316',
  left: '#3b82f6',
  right: '#a855f7',
  merged: '#14b8a6',
  range1: '#3b82f6',
  range2: '#a855f7',
  range3: '#14b8a6',
  // A red-black tree needs its two colours named, or `colorOf` falls through to the
  // hash fallback and the invariants read as arbitrary hues. Black is a dark grey
  // rather than #000 so a black node still reads against a dark node fill.
  red: '#ef4444',
  black: '#475569',
};

const FALLBACK = [
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#eab308',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

export function colorOf(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const known = PALETTE[name];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

export function cellStyle(color: string | null | undefined): CSSProperties {
  const c = colorOf(color);
  return c ? { backgroundColor: c, borderColor: c } : {};
}
