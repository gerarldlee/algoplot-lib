import { useMemo } from 'react';
import { usePlayer } from './playerContext';

/**
 * The log half of the chrome: every line the run logged, each one clickable to seek to
 * the step that wrote it. No tab strip — the app pairs this panel with an input box the
 * player has no use for, so the panel is the body alone.
 */
export function LogPanel() {
  const logs = usePlayer((s) => s.world.logs);
  const logSteps = usePlayer((s) => s.logSteps);
  const idx = usePlayer((s) => s.idx);
  const seek = usePlayer((s) => s.seek);

  // The newest log line already folded into the world at the current step. Comparing each
  // line to `idx` would only ever mark one exact position, which is wrong while scrubbing.
  const activeLog = useMemo(() => {
    let best = -1;
    for (let i = 0; i < logSteps.length; i++) if (logSteps[i] < idx) best = i;
    return best;
  }, [logSteps, idx]);

  return (
    <div className="log-area">
      <div className="log-area-body">
        {logs.length === 0 ? (
          <span className="logs-empty">log output (console.log / viz.log) appears here</span>
        ) : (
          logs.map((l, i) => {
            const at = logSteps[i];
            if (at === undefined) {
              return (
                <div className="log-line" key={i}>
                  {l}
                </div>
              );
            }
            // seek(idx) materialises the world *after* steps 0..idx-1, so the state
            // that contains this log sits one step past the index that wrote it.
            const lands = at + 1;
            return (
              <div
                className={`log-line${i === activeLog ? ' current' : ''}`}
                key={i}
                role="button"
                tabIndex={0}
                title={`Jump to step ${lands}`}
                onClick={() => seek(lands)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    seek(lands);
                  }
                }}
              >
                {l}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
