/**
 * Empirical growth measurement.
 *
 * A Big-O claim is a statement about how work scales with n, so the way to check it is to
 * run the algorithm at a range of sizes and look at the growth. On a log-log plot a
 * polynomial O(n^k) is a straight line whose *slope is k*; log n and n log n curve, and
 * for those the honest answer is a range of local slopes rather than one exponent.
 *
 * This is the measurement layer only. It never reads the template's annotation - the
 * comparison between the two lives in the UI, so an unannotated template still gets a
 * useful curve.
 */

export interface GrowthPoint {
  n: number;
  /** Recorded steps, the proxy for work. */
  steps: number;
  /** Retained bytes at the end of the run, the proxy for data held. */
  bytes: number;
  ok: boolean;
  error?: string;
  /** Wall clock for the run, informational only - see note on ms below. */
  ms?: number;
}

export interface GrowthFit {
  /** Least-squares slope over the usable points, or null when there are too few. */
  slope: number | null;
  /** Slope of each consecutive pair, in the same units as `slope`. */
  local: { from: number; to: number; slope: number }[];
  /** Spread between the largest and smallest local slope. */
  drift: number;
  points: GrowthPoint[];
}

/**
 * The step cap used for a measurement run. A sweep that inherits the user's 10,000-step
 * cap dies on the largest size and reports nothing useful, so measurement gets its own
 * budget and the ladder stops before it is reached. It is never allowed to exceed what the
 * user set.
 */
export const MEASURE_STEP_FRACTION = 0.6;

export const MIN_SLOPE_POINTS = 3;

/** Points that can contribute to a fit. */
function usable(points: GrowthPoint[]): GrowthPoint[] {
  return points.filter((p) => p.ok && p.n > 0 && p.steps > 0);
}

/**
 * Recorded bytes per recorded step.
 *
 * Total retained bytes is a function of *both* the algorithm's data size and how many steps
 * it took, because the recorder keeps a patch set per step. Bubble sort is O(1) in extra
 * room, yet its total recorded data measures as O(n^2) purely from its step count.
 * Dividing by the step count removes that dependence and leaves how much the recording
 * grows per step of work.
 *
 * This is still a measurement of the recorder, not of the algorithm's live footprint, and
 * it reads flat for anything that visualises a fixed-size local change per step. The dialog
 * says so wherever it is shown.
 */
export function bytesPerStep(p: GrowthPoint): number {
  return p.steps > 0 ? p.bytes / p.steps : 0;
}

/** The same fit, run over any per-point measure rather than steps. */
export function fitSeries(points: GrowthPoint[], measure: (p: GrowthPoint) => number): GrowthFit {
  const projected = points.map((p) => ({ ...p, steps: measure(p) }));
  return fitGrowth(projected);
}

export interface AnchoredPoint {
  n: number;
  /** The measure divided by its own first value, so the series starts at exactly 1. */
  y: number;
}

/**
 * Rescale a series so its first value is 1, for plotting.
 *
 * This is a pure multiplicative rescale - every value divided by the same constant - so the
 * *shape* of the curve is preserved exactly. That is what lets the charts use linear axes:
 * an O(n^2) series still bends, and a flat one is still flat, while the differing units of
 * steps and bytes stop having to share an axis.
 *
 * Note this is a rescale, not a logarithm: it changes no slope and no conclusion, and the
 * fitted exponent is computed from log2 values in fitGrowth regardless of how this is
 * drawn. Anchoring on the *first* point rather than the minimum is what a reference curve
 * of the claimed class is drawn through.
 */
export function anchorAt1(points: GrowthPoint[], measure: (p: GrowthPoint) => number): AnchoredPoint[] {
  const values = points.map(measure);
  const base = values.find((v) => v > 0);
  if (base === undefined) return [];
  return points.map((p, i) => ({ n: p.n, y: values[i] / base }));
}

/**
 * Local slope between two points: log2(step ratio) / log2(n ratio). The number of
 * doublings is a divisor, not an assumption of 1, so a ladder that is not exactly ×2 per
 * step still produces a correct exponent.
 */
function slopeBetween(a: GrowthPoint, b: GrowthPoint): number {
  const dn = Math.log2(b.n / a.n);
  if (dn === 0) return NaN;
  return Math.log2(b.steps / a.steps) / dn;
}

export function fitGrowth(points: GrowthPoint[]): GrowthFit {
  const good = usable(points);
  const local: { from: number; to: number; slope: number }[] = [];
  for (let i = 1; i < good.length; i++) {
    const s = slopeBetween(good[i - 1], good[i]);
    if (Number.isFinite(s)) local.push({ from: good[i - 1].n, to: good[i].n, slope: s });
  }

  let slope: number | null = null;
  if (good.length >= MIN_SLOPE_POINTS) {
    // Least squares on the log-log points: slope = cov(x, y) / var(x) with x = log2 n.
    let sx = 0;
    let sy = 0;
    for (const p of good) {
      sx += Math.log2(p.n);
      sy += Math.log2(p.steps);
    }
    const mx = sx / good.length;
    const my = sy / good.length;
    let num = 0;
    let den = 0;
    for (const p of good) {
      const dx = Math.log2(p.n) - mx;
      num += dx * (Math.log2(p.steps) - my);
      den += dx * dx;
    }
    if (den > 0) slope = num / den;
  }

  // No "is this a power law" verdict. It is not knowable from the data: over 16..128 an
  // n log n series drifts by 0.10 and a log n series drifts by 0.10 as well, so any
  // threshold that caught one would be arbitrary and size-range dependent. Instead the
  // local slopes are always reported, which lets a drifting exponent be seen rather than
  // asserted - the measurement describes behaviour at these sizes, not the asymptote.
  const drift = local.length >= 2 ? Math.max(...local.map((l) => l.slope)) - Math.min(...local.map((l) => l.slope)) : 0;

  return { slope, local, drift, points };
}

/**
 * Human phrasing for a measured exponent, always qualified by the local range. The
 * qualification is not decoration: a single number here would imply an asymptotic claim
 * the measurement cannot support.
 */
export function describeSlope(fit: GrowthFit): string {
  if (fit.local.length === 0) return 'not enough data to measure';
  const los = fit.local.map((l) => l.slope);
  const lo = Math.min(...los);
  const hi = Math.max(...los);
  const range = hi - lo < 0.05 ? '' : `, local ${lo.toFixed(2)}-${hi.toFixed(2)}`;
  const k = fit.slope ?? lo;
  let shape: string;
  if (k < 0.15) shape = 'roughly constant';
  else if (k < 0.4) shape = 'logarithmic-ish';
  else if (k < 0.8) shape = 'sub-linear';
  else shape = `O(n^${Math.round(k * 10) / 10})`;
  return `${shape}${range}`;
}

/** Formats a byte count for the table. Duplicated from core/size to keep this pure. */
export function formatCost(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** How many intervals a y axis aims for. Four or five reads well in a 150px plot. */
const Y_TICK_TARGET = 5;

/** The 1 / 2 / 2.5 / 5 / 10 ladder, so ticks land on values a reader recognises. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceStep(top: number, target = Y_TICK_TARGET): number {
  if (!(top > 0)) return 1;
  const raw = top / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / magnitude;
  const step = NICE_STEPS.find((s) => norm <= s) ?? 10;
  return step * magnitude;
}

/**
 * Y axis ticks from 0 up to at least `max`.
 *
 * The axis top is rounded up to a whole number of steps, so the ticks are round values
 * rather than whatever `max * 1.1` happens to be - 18.35 would otherwise label 3.7 and 7.4.
 * The axis is deliberately 0-based rather than fitted to the data: the space series moves
 * by about 5%, and auto-scaling it to its own range would render that as a dramatic rise.
 */
export function yTicks(max: number, target = Y_TICK_TARGET): number[] {
  const step = niceStep(Math.max(max, Number.EPSILON), target);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const out: number[] = [];
  // Accumulate by index rather than repeated addition, which would drift on 0.25 steps.
  for (let i = 0; i * step <= top + step / 1000; i++) out.push(Number((i * step).toPrecision(12)));
  return out;
}

/** Tick label for a y value: bare zero, otherwise a multiple of the anchor. */
export function yTickLabel(v: number): string {
  if (v === 0) return '0';
  const s = Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
  return `${s}×`;
}
