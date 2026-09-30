import { MEMORY_WARN_BYTES, formatBytes } from '@algoplot/core';
import { usePlayer } from './playerContext';

const H = 46;
const W = 240;

/**
 * Growth of the *recording*, not of the browser's heap. It is the number the step cap is
 * really about: every step keeps a patch set, and every keyframe adds a whole world copy
 * on top, so the curve is a staircase. Deliberately labelled `recorded` in the readout so
 * it cannot be mistaken for a process memory profile.
 */
export function MemoryGraph() {
  const mem = usePlayer((s) => s.mem);
  const idx = usePlayer((s) => s.idx);

  // One entry per step, so a run of N steps has N+1 samples. Fewer than two points (or a
  // flat zero run) has no shape worth drawing.
  const total = mem.length ? mem[mem.length - 1] : 0;
  if (mem.length < 3 || total <= 0) return null;

  const peak = Math.max(...mem);
  const x = (i: number) => (i / (mem.length - 1)) * W;
  const y = (v: number) => H - (peak > 0 ? (v / peak) * (H - 2) : 0) - 1;

  const line = mem.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  // Clamp inside the plot so a partial run (idx === 0, or a step past the series) cannot
  // push the marker off the right edge.
  const here = Math.max(0, Math.min(idx, mem.length - 1));
  const hx = x(here);
  const hy = y(mem[here]);
  const current = mem[here];
  const over = current > MEMORY_WARN_BYTES;

  return (
    <div className="mem-graph">
      {/* "Memory Growth" is the friendlier label, but on its own it reads like a process
          memory profile. The tooltip is where the distinction survives: this is the size of
          the recording, and the browser's own heap is not observable from a worker. */}
      <span
        className="mem-label"
        title="How much data the recording holds. This is the step/keyframes budget, not the browser's heap — real heap is not observable from the worker the algorithm runs in."
      >
        Memory Growth
        <b className={over ? 'mem-val warn' : 'mem-val'}>{formatBytes(current)}</b>
      </span>
      <svg
        className="mem-plot"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Memory growth of the recorded run: the recording grows to ${formatBytes(peak)} across ${mem.length - 1} steps; ${formatBytes(current)} at the current step. This is the recorded data, not the browser's heap.`}
      >
        <path className="mem-area" d={area} />
        <path className="mem-line" d={line} />
        <line className="mem-cursor" x1={hx} x2={hx} y1="0" y2={H} />
        <circle className="mem-dot" cx={hx} cy={hy} r="2.5" />
      </svg>
    </div>
  );
}
