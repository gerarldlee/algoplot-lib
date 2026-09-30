/**
 * Retained-size estimate for a recorded run.
 *
 * A hand-rolled walker was the obvious first idea, but the data reaching this point has
 * already been through `snapshot()` in diff.ts, i.e. it is acyclic plain JSON produced by
 * JSON.parse. That makes one JSON.stringify an exact-enough measure of what the recorder
 * is holding, with no depth limit, no node budget and no cycle handling to get wrong.
 *
 * The multiplier is 2 because JS strings are UTF-16, so `.length` counts code units, not
 * bytes. Object and array headers are not counted, so treat the result as a floor rather
 * than a figure to quote as precise.
 */
export function bytesOf(value: unknown): number {
  if (value === undefined) return 0;
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    // Unreachable for recorder output, but a cost probe must never break a compile.
    return 0;
  }
}

/** Human-readable byte count for the readout: 0, 812 B, 64 KB, 1.4 MB. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Where a tab starts genuinely struggling rather than where a product would choose a
 * limit. The step cap is the real budget knob; this only tints the readout.
 */
export const MEMORY_WARN_BYTES = 64 * 1024 * 1024;
