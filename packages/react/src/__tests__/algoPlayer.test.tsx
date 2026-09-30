import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createPlayerStore, runCode, type RunOutput } from '@algoplot/core';
import { AlgoPlayer } from '../AlgoPlayer';

const bubble = `
const a = viz.array([5, 3, 8, 1]);
for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - 1 - i; j++) {
    if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
  }
  a.mark(a.length - 1 - i, 'sorted');
}
viz.step('sorted');
`;

const withLog = `console.log('hello from the run');\nconst a = viz.array([1, 2]);`;

function run(code: string): RunOutput {
  const out = runCode(code, {});
  expect(out.ok).toBe(true);
  return out;
}

describe('AlgoPlayer', () => {
  it('renders the recording on first paint — no effect has run', () => {
    const data = run(bubble);
    const html = renderToString(<AlgoPlayer data={data} />);
    expect(html).toContain('ak-player');
    expect(html).toContain('view-area');
    expect(html).toContain('chrome');
    expect(html).toContain('transport');
    expect(html).toContain(`recorded ${data.steps.length} steps — press Play`);
    // The world is materialised during construction, so the view area holds the
    // structure, not the empty-state placeholder.
    expect(html).not.toContain('class="placeholder"');
    expect(html).toContain('5');
  });

  it('shows the log panel only when the run logged something', () => {
    // Panel presence comes from the recording's whole logSteps, so it is already
    // right on first paint — where world.logs is still empty (idx 0 folds nothing in).
    const logged = renderToString(<AlgoPlayer data={run(withLog)} />);
    expect(logged).toContain('log-area');

    const quiet = renderToString(<AlgoPlayer data={run(bubble)} />);
    expect(quiet).not.toContain('log-area');

    // The lines themselves become available once the player is seeked past them.
    // (A server render cannot show them: it reads boot state, where idx 0 has folded
    // nothing in — the same reason the app's log panel is empty at idx 0.)
    const data = run(withLog);
    const store = createPlayerStore(data);
    store.getState().seek(store.getState().steps.length);
    expect(store.getState().world.logs).toContain('hello from the run');
  });

  it('can be told to show or hide the optional chrome pieces', () => {
    const noMemory = renderToString(<AlgoPlayer data={run(bubble)} memory={false} />);
    expect(noMemory).not.toContain('mem-graph');

    const forcedLogs = renderToString(<AlgoPlayer data={run(bubble)} logs />);
    expect(forcedLogs).toContain('log-area');
    expect(forcedLogs).toContain('log output (console.log / viz.log) appears here');
  });

  it('renders a failed recording as the error row, not a crash', () => {
    const out = runCode('viz.note("start");\nthrow new Error("boom");', {});
    expect(out.ok).toBe(false);
    const html = renderToString(<AlgoPlayer data={out} />);
    expect(html).toContain('error:');
    expect(html).toContain('boom');
    // React's SSR inserts `<!-- -->` between adjacent text nodes; strip them so the
    // assertion is about what a reader sees.
    expect(html.replaceAll('<!-- -->', '')).toContain('— at line 2');
  });

  it('uses a caller-supplied placeholder while the scrubber is on step 0', () => {
    const html = renderToString(<AlgoPlayer data={run(bubble)} placeholder="watch it sort" />);
    expect(html).toContain('watch it sort');
  });

  it('accepts a caller-owned store so outside controls can drive it', () => {
    const data = run(bubble);
    // Built with the run, because a server render reads the store's *initial* state —
    // a store loaded afterwards only becomes visible after hydration (documented
    // behaviour of the external-store path, and why the widget builds its own store).
    const store = createPlayerStore(data);
    const html = renderToString(<AlgoPlayer data={data} store={store} />);
    expect(html).toContain('ak-player');
    expect(html).not.toContain('class="placeholder"');
    store.getState().seek(2);
    expect(store.getState().idx).toBe(2);
  });
});
