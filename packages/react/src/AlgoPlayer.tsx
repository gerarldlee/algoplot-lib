import { useEffect, useState } from 'react';
import { createPlayerStore, type PlayerStore, type RunOutput } from '@algoplot/core';
import { PlayerProvider, usePlayer } from './playerContext';
import { StructView } from './views/registry';
import { Transport } from './Transport';
import { MemoryGraph } from './MemoryGraph';
import { LogPanel } from './LogPanel';

export interface AlgoPlayerProps {
  /**
   * The recording, exactly as `runCode` (or a ```algoplot fence executed at build time)
   * produced it. A new `data` identity reloads the player.
   */
  data: RunOutput;
  /** Start playback as soon as a recording is loaded. Off by default. */
  autoplay?: boolean;
  /**
   * Show the log panel. Defaults to "the run logged something" — decided from the
   * recording's whole logSteps, not the visible world's logs, so the panel cannot
   * appear and vanish as the scrubber moves.
   */
  logs?: boolean;
  /** Show the memory-growth chart above the transport. On by default. */
  memory?: boolean;
  /** Caption and empty-view text while the player sits on step 0 with no message. */
  placeholder?: string;
  /** Extra class on the root, for host theming hooks. */
  className?: string;
  /** Bring your own store, so controls outside the widget can drive it. */
  store?: PlayerStore;
}

function PlayerBody({
  logs,
  memory,
  placeholder,
}: Pick<AlgoPlayerProps, 'logs' | 'memory' | 'placeholder'>) {
  const error = usePlayer((s) => s.error);
  const message = usePlayer((s) => s.message);
  const steps = usePlayer((s) => s.steps);
  const logSteps = usePlayer((s) => s.logSteps);
  const world = usePlayer((s) => s.world);

  // The app's placeholder also covers compiling/idle — states a precomputed recording
  // never has, so the player's version is only about where the scrubber is.
  const step0 =
    steps.length === 0 ? 'no steps recorded' : `recorded ${steps.length} steps — press Play`;
  const ph = placeholder ?? step0;
  const showLogs = logs ?? logSteps.length > 0;

  return (
    <>
      <div className="view-area">
        {world.order.length === 0 ? (
          <div className="placeholder">{ph}</div>
        ) : (
          world.order.map((id) => <StructView key={id} data={world.structs[id]} />)
        )}
      </div>

      <div className="chrome">
        <div className="chrome-main">
          {error && (
            <div className="error">
              <strong>error:</strong> {error.message}
              {error.line !== undefined && <span className="err-line"> — at line {error.line}</span>}
            </div>
          )}

          <div className="caption">{message || ph}</div>

          <div className="metrics">
            {Object.entries(world.metrics).map(([k, v]) => (
              <span className="metric" key={k}>
                <b>{k}</b> {String(v)}
              </span>
            ))}
          </div>

          {memory !== false && <MemoryGraph />}

          <Transport />
        </div>

        {showLogs && <LogPanel />}
      </div>
    </>
  );
}

/**
 * The whole widget: one visualisation area over one chrome row (caption, metrics,
 * memory graph, transport, logs), each player owning its own store. Renders correctly
 * on the first paint — the store is built with the recording, so server rendering
 * emits the world rather than a placeholder that swaps after hydration. The load
 * effect below is then a no-op on first mount for an owned store (same data), and is
 * what reloads either kind of store when the `data` prop changes.
 */
export function AlgoPlayer({
  data,
  autoplay,
  logs,
  memory,
  placeholder,
  className,
  store: external,
}: AlgoPlayerProps) {
  const [owned] = useState(() => external ?? createPlayerStore(data));

  useEffect(() => {
    owned.getState().loadRun(data);
  }, [owned, data]);

  // The provider's own cleanup never fires here (we always hand it a store), so
  // stopping the playback loop of a store *we* created is this component's job. An
  // external store outlives us by definition and is not ours to stop.
  useEffect(() => {
    if (external) return;
    return () => owned.getState().destroy();
  }, [external, owned]);

  useEffect(() => {
    if (autoplay) owned.getState().play();
  }, [owned, autoplay, data]);

  const rootClass = className ? `ak-player ${className}` : 'ak-player';
  return (
    <PlayerProvider store={owned}>
      <div className={rootClass}>
        <PlayerBody logs={logs} memory={memory} placeholder={placeholder} />
      </div>
    </PlayerProvider>
  );
}
