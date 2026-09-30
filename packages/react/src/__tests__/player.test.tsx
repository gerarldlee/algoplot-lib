import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createPlayerStore, runCode, type PlayerStore } from '@algoplot/core';
import { Transport } from '../Transport';
import { PlayerProvider, usePlayerStore } from '../playerContext';

const program = `
const a = viz.array([3, 1, 2]);
a.swap(0, 1);
viz.step('swapped');
`;

function makeRun() {
  const out = runCode(program, {});
  expect(out.ok).toBe(true);
  expect(out.steps.length).toBeGreaterThan(1);
  return out;
}

function Capture({ into }: { into: PlayerStore[] }) {
  into.push(usePlayerStore());
  return null;
}

describe('createPlayerStore', () => {
  it('keeps playback state isolated between two players', () => {
    const a = createPlayerStore();
    const b = createPlayerStore();
    a.getState().loadRun(makeRun());
    b.getState().loadRun(makeRun());
    a.getState().seek(2);
    expect(a.getState().idx).toBe(2);
    expect(b.getState().idx).toBe(0);
    expect(b.getState().message).toBe('');
  });

  it('destroy stops playback without touching a run already loaded', () => {
    const store = createPlayerStore();
    store.getState().loadRun(makeRun());
    store.getState().seek(1);
    store.getState().destroy();
    expect(store.getState().playing).toBe(false);
    expect(store.getState().idx).toBe(1);
  });
});

describe('PlayerProvider', () => {
  it('hands each provider its own store', () => {
    const seen: PlayerStore[] = [];
    renderToString(
      <PlayerProvider>
        <Capture into={seen} />
      </PlayerProvider>,
    );
    renderToString(
      <PlayerProvider>
        <Capture into={seen} />
      </PlayerProvider>,
    );
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });

  it('renders a Transport inside a provider', () => {
    const html = renderToString(
      <PlayerProvider>
        <Transport />
      </PlayerProvider>,
    );
    expect(html).toContain('Play');
    expect(html).toContain('Restart');
  });

  it('fails loudly when a player hook is used with no provider', () => {
    expect(() => renderToString(<Transport />)).toThrow(/PlayerProvider/);
  });
});
