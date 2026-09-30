import type { Recorder } from '../recorder';
import { Struct } from './base';

export type BookLevel = { px: number; qty: number };
export type BookTrade = { px: number; qty: number; side: 'buy' | 'sell' };

export type BookData = {
  type: 'book';
  name: string;
  bids: BookLevel[];
  asks: BookLevel[];
  trades: BookTrade[];
  last: BookTrade | null;
};

export class VizBook extends Struct {
  declare readonly data: BookData;

  constructor(rec: Recorder, id: string, name = 'order book') {
    const data: BookData = { type: 'book', name, bids: [], asks: [], trades: [], last: null };
    super(rec, id, data);
  }

  limit(side: 'buy' | 'sell', px: number, qty: number, msg?: string): void {
    const levels = side === 'buy' ? this.data.bids : this.data.asks;
    const ex = levels.find((l) => l.px === px);
    if (ex) ex.qty += qty;
    else levels.push({ px, qty });
    levels.sort((a, b) => (side === 'buy' ? b.px - a.px : a.px - b.px));
    this.record(msg ?? `limit ${side} ${qty} @ ${px}`);
  }

  market(side: 'buy' | 'sell', qty: number, msg?: string): number {
    // buying lifts asks; selling hits bids
    const levels = side === 'buy' ? this.data.asks : this.data.bids;
    let remain = qty;
    let filled = 0;
    let cost = 0;
    const fills: BookTrade[] = [];
    while (remain > 0 && levels.length > 0) {
      const best = levels[0];
      const take = Math.min(best.qty, remain);
      best.qty -= take;
      remain -= take;
      filled += take;
      cost += take * best.px;
      fills.push({ px: best.px, qty: take, side });
      if (best.qty === 0) levels.shift();
    }
    for (const f of fills) {
      this.data.trades.push(f);
      this.data.last = f;
    }
    const avg = filled > 0 ? cost / filled : NaN;
    this.record(
      msg ??
        `market ${side} ${qty} → filled ${filled}${filled > 0 ? ` @ avg ${avg.toFixed(2)}` : ''}${
          remain > 0 ? `, ${remain} unfulfilled` : ''
        }`,
    );
    return filled;
  }

  bestBid(): number | null {
    return this.data.bids.length > 0 ? this.data.bids[0].px : null;
  }

  bestAsk(): number | null {
    return this.data.asks.length > 0 ? this.data.asks[0].px : null;
  }

  mid(): number | null {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b !== null && a !== null ? (b + a) / 2 : null;
  }

  clearTrades(msg?: string): void {
    this.data.trades = [];
    this.record(msg ?? 'clear trades');
  }
}
