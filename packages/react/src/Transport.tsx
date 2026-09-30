import { usePlayer } from './playerContext';

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];

/**
 * A clockwise loop rather than a U+23EE skip-to-start glyph. The transport already has
 * dedicated "Step back" and "Jump to end" buttons, so the old double-triangle both
 * duplicated them and read as a second "back" control. Inline SVG like the theme icons in
 * App.tsx, so it does not depend on the font having a good U+21BA.
 */
function RestartIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden focusable="false">
      <path
        d="M11.68 4.32A5.2 5.2 0 1 1 8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M10.1 2.8 8 1.4 8 4.2Z" fill="currentColor" />
    </svg>
  );
}

export function Transport() {
  const status = usePlayer((s) => s.status);
  const idx = usePlayer((s) => s.idx);
  const steps = usePlayer((s) => s.steps);
  const playing = usePlayer((s) => s.playing);
  const speed = usePlayer((s) => s.speed);
  const seek = usePlayer((s) => s.seek);
  const stepFwd = usePlayer((s) => s.stepFwd);
  const stepBack = usePlayer((s) => s.stepBack);
  const toggle = usePlayer((s) => s.toggle);
  const restart = usePlayer((s) => s.restart);
  const setSpeed = usePlayer((s) => s.setSpeed);

  const hasSteps = steps.length > 0;
  const disabled = !hasSteps || status === 'running';

  return (
    <div className="transport">
      <button className="btn" disabled={disabled} onClick={restart} title="Restart">
        <RestartIcon />
      </button>
      <button className="btn" disabled={disabled} onClick={stepBack} title="Step back">
        ◀
      </button>
      <button
        className="btn primary"
        disabled={disabled}
        onClick={toggle}
        title="Play / pause (Space)"
      >
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>
      <button className="btn" disabled={disabled} onClick={stepFwd} title="Step forward">
        ▶|
      </button>
      <button
        className="btn"
        disabled={disabled}
        onClick={() => seek(steps.length)}
        title="Jump to end"
      >
        ⏭
      </button>
      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(1, steps.length)}
        value={idx}
        disabled={disabled}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <span className="counter">
        {idx} / {steps.length}
      </span>
      <select
        className="field"
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        title="Playback speed"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
    </div>
  );
}
