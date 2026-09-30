import { applyPatch, cloneWorld } from './diff';
import type { Step, World } from './types';

export function materializeAt(
  keyframes: { i: number; w: World }[],
  steps: Step[],
  idx: number,
): World {
  let kf = keyframes[0];
  for (const k of keyframes) {
    if (k.i <= idx) kf = k;
    else break;
  }
  const w = cloneWorld(kf.w);
  for (let i = kf.i; i < idx; i++) {
    for (const p of steps[i].p) applyPatch(w, p);
  }
  return w;
}
