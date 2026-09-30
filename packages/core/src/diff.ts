import type { Patch, Path, World } from './types';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * A patch value is a snapshot, not a live reference. The world keeps mutating after
 * a step is recorded, so without this an early step that replaced an array (e.g. the
 * struct order, or a growing `bars` array) would replay as its final state.
 */
function snapshot(v: unknown): unknown {
  return v !== null && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
}

function walk(a: unknown, b: unknown, path: Path, out: Patch[]): void {
  if (Object.is(a, b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      out.push({ p: path.slice(), v: snapshot(b) });
      return;
    }
    for (let i = 0; i < a.length; i++) walk(a[i], b[i], [...path, i], out);
    return;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(b)) {
      walk(a[k], b[k], [...path, k], out);
    }
    for (const k of Object.keys(a)) {
      if (!(k in b)) out.push({ p: [...path, k], v: undefined });
    }
    return;
  }
  out.push({ p: path.slice(), v: snapshot(b) });
}

export function diffWorlds(a: World, b: World): Patch[] {
  const out: Patch[] = [];
  walk(a, b, [], out);
  return out;
}

export function cloneWorld(w: World): World {
  return JSON.parse(JSON.stringify(w)) as World;
}

export function applyPatch(w: World, p: Patch): void {
  const { p: path, v } = p;
  if (path.length === 0) {
    if (v !== undefined && typeof v === 'object' && v !== null) {
      const nw = v as World;
      w.order = nw.order;
      w.structs = nw.structs;
      w.metrics = nw.metrics;
      w.logs = nw.logs;
    }
    return;
  }
  let cur: unknown = w;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const holder = cur as Record<string | number, unknown>;
    let next = holder[k];
    if (next === undefined || next === null || typeof next !== 'object') {
      next = typeof path[i + 1] === 'number' ? [] : {};
      holder[k] = next;
    }
    cur = next;
  }
  const last = path[path.length - 1];
  if (v === undefined) {
    if (Array.isArray(cur)) {
      cur.splice(last as number, 1);
    } else if (isObj(cur)) {
      delete cur[last as string];
    }
  } else {
    (cur as Record<string | number, unknown>)[last] = v;
  }
}

export function applySteps(w: World, patches: Patch[][]): void {
  for (const ps of patches) for (const p of ps) applyPatch(w, p);
}
