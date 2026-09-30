/* eslint-disable react-refresh/only-export-components -- a context provider and the
   hooks that read it are one unit; splitting them across files buys nothing but an
   import hop, and this file never hot-reloads (it is a published library). */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createPlayerStore, type PlayerState, type PlayerStore } from '@algoplot/core';

const PlayerContext = createContext<PlayerStore | null>(null);

export interface PlayerProviderProps {
  /**
   * Pass an existing store to control the player from outside; omit for a fresh one.
   * The prop is read once — hand over a stable store.
   */
  store?: PlayerStore;
  children: ReactNode;
}

/**
 * Owns one player store per mounted subtree. Every Transport, view and log panel below
 * the provider reads *this* store, so several players on one page never share an index.
 * A store this component created is destroyed on unmount, which stops its playback
 * loop; a store handed in from outside is left alone — it is not ours to stop.
 */
export function PlayerProvider({ store, children }: PlayerProviderProps) {
  const [owned] = useState(() => store ?? createPlayerStore());
  useEffect(() => {
    if (store) return;
    return () => owned.getState().destroy();
  }, [owned, store]);
  return <PlayerContext.Provider value={owned}>{children}</PlayerContext.Provider>;
}

/** The store for the nearest provider. Throws outside one — that is a wiring bug. */
export function usePlayerStore(): PlayerStore {
  const store = useContext(PlayerContext);
  if (!store) {
    throw new Error('usePlayerStore must be used inside <PlayerProvider>');
  }
  return store;
}

/** Selector hook over the nearest provider's store, zustand-style. */
export function usePlayer<T>(selector: (state: PlayerState) => T): T {
  return useStore(usePlayerStore(), selector);
}
