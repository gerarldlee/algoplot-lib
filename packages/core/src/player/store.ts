import { createStore, type StoreApi } from 'zustand/vanilla';
import type { RunOutput } from '../run';
import { materializeAt } from '../materialize';
import { emptyWorld, type Step, type World } from '../types';

export type PlayerStatus = 'idle' | 'running' | 'ready' | 'error';

export const BASE_STEPS_PER_SEC = 10;

export interface PlayerState {
  status: PlayerStatus;
  error?: { message: string; line?: number };
  steps: Step[];
  keyframes: { i: number; w: World }[];
  /** Cumulative estimated retained bytes per step, from the recorder. */
  mem: number[];
  /** Step index of each log line, so a log row can seek to where it was written. */
  logSteps: number[];
  world: World;
  idx: number;
  message: string;
  /** 1-based line of the user code that produced the step at `idx`, for the editor. */
  line: number | undefined;
  playing: boolean;
  speed: number;

  loadRun(out: RunOutput): void;
  setStatus(s: PlayerStatus): void;
  setError(err?: { message: string; line?: number }): void;
  seek(idx: number): void;
  stepFwd(): void;
  stepBack(): void;
  play(): void;
  pause(): void;
  toggle(): void;
  restart(): void;
  setSpeed(s: number): void;
  /** Stop any playback loop. Call on unmount so no rAF outlives its player. */
  destroy(): void;
}

export type PlayerStore = StoreApi<PlayerState>;

function messageAt(steps: Step[], idx: number): string {
  if (idx <= 0) return '';
  return steps[idx - 1].m ?? '';
}

function lineAt(steps: Step[], idx: number): number | undefined {
  if (idx <= 0) return undefined;
  return steps[idx - 1]?.l;
}

/**
 * The state a recording puts in a store. Separate from `loadRun` because the factory
 * spreads it into `createStore`'s initial state: `renderToString` reads zustand's
 * *initial* state (the `getServerSnapshot` of `useSyncExternalStore`), so a run set
 * afterwards would never reach a server-rendered first paint — the widget would emit
 * its placeholder and swap the world in only on hydration.
 */
function runState(out: RunOutput): Partial<PlayerState> {
  const world = out.steps.length ? materializeAt(out.keyframes, out.steps, 0) : out.world;
  return {
    status: out.ok ? 'ready' : 'error',
    error: out.error,
    steps: out.steps,
    keyframes: out.keyframes,
    mem: out.mem,
    logSteps: out.logSteps,
    world,
    idx: 0,
    message: '',
    line: undefined,
    playing: false,
  };
}

/**
 * One store per player. The app this came from had exactly one player on screen, so it
 * kept a module-level singleton — but a docs page can render any number of
 * ```algoplot fences, and a shared `idx` would have every scrubber driving every
 * visualisation at once. The playback loop state (rAF handle, clock, accumulator) lives
 * in the closure for the same reason: it belongs to one player, not to the module.
 *
 * `initialRun` loads a recording during construction, so a component's first render
 * already sees the recording's world — server rendering included, where no effect
 * ever runs.
 */
export function createPlayerStore(initialRun?: RunOutput): PlayerStore {
  let rafId = 0;
  let lastT = 0;
  let acc = 0;

  // The loop reads `store` through a closure that only ever runs after createStore
  // returns, so the const below is settled by the time anyone calls it. The three
  // functions are declarations, not consts, so the initializer can reference them.
  function stopLoop(): void {
    if (rafId !== 0) cancelAnimationFrame(rafId);
    rafId = 0;
    lastT = 0;
    acc = 0;
  }

  function loop(t: number): void {
    const s = store.getState();
    if (!s.playing) {
      stopLoop();
      return;
    }
    if (!lastT) lastT = t;
    const dt = Math.min((t - lastT) / 1000, 0.25);
    lastT = t;
    acc += dt * BASE_STEPS_PER_SEC * s.speed;
    const n = Math.floor(acc);
    if (n > 0) {
      acc -= n;
      const target = Math.min(s.idx + n, s.steps.length);
      if (target !== s.idx) s.seek(target);
      if (target >= s.steps.length) {
        store.setState({ playing: false });
        stopLoop();
        return;
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    // No clock outside a browser: a headless consumer (build-time rendering, tests)
    // drives the player with seek() instead, and play() still flips `playing` so the
    // transport state reads correctly.
    if (typeof requestAnimationFrame !== 'function') return;
    if (rafId === 0) rafId = requestAnimationFrame(loop);
  }

  const store = createStore<PlayerState>((set, get) => ({
    status: 'idle',
    steps: [],
    keyframes: [],
    mem: [0],
    logSteps: [],
    world: emptyWorld(),
    idx: 0,
    message: '',
    line: undefined,
    playing: false,
    speed: 1,
    ...(initialRun ? runState(initialRun) : {}),

    loadRun(out) {
      set(runState(out));
      stopLoop();
    },

    setStatus(status) {
      set({ status });
    },

    setError(error) {
      set({ error, status: error ? 'error' : 'ready' });
    },

    seek(idx) {
      const { steps, keyframes } = get();
      const clamped = Math.max(0, Math.min(idx, steps.length));
      const world = materializeAt(keyframes, steps, clamped);
      set({ idx: clamped, world, message: messageAt(steps, clamped), line: lineAt(steps, clamped) });
    },

    stepFwd() {
      get().seek(get().idx + 1);
    },

    stepBack() {
      get().seek(get().idx - 1);
    },

    play() {
      if (get().idx >= get().steps.length) get().seek(0);
      set({ playing: true });
      startLoop();
    },

    pause() {
      set({ playing: false });
    },

    toggle() {
      if (get().playing) get().pause();
      else get().play();
    },

    restart() {
      get().seek(0);
      set({ playing: false });
    },

    setSpeed(s) {
      set({ speed: s });
    },

    destroy() {
      stopLoop();
      set({ playing: false });
    },
  }));

  return store;
}
