import type { BookData } from '@algoplot/core';
import { colorOf } from './palette';

const W = 560;
const ROW = 24;
const PAD = 14;
const MID_X = W / 2;
const BAR_MAX = 150;

export function BookView({ data }: { data: BookData }) {
  const asks = data.asks; // sorted asc: best (lowest) first
  const bids = data.bids; // sorted desc: best (highest) first
  const maxQty = Math.max(1, ...asks.map((l) => l.qty), ...bids.map((l) => l.qty));
  const asksTop = asks.slice().reverse(); // highest price at top
  const H = PAD * 2 + (asksTop.length + bids.length + 1) * ROW + 34;
  const yAsk = (i: number) => PAD + 30 + i * ROW;
  const yMid = PAD + 30 + asksTop.length * ROW;
  const yBid = (i: number) => yMid + ROW + i * ROW;

  const bidColor = colorOf('found')!;
  const askColor = colorOf('reject')!;

  return (
    <svg className="book-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <text x={MID_X - BAR_MAX - 12} y={PAD + 14} textAnchor="middle" className="book-head">
        bid qty
      </text>
      <text x={MID_X} y={PAD + 14} textAnchor="middle" className="book-head">
        price
      </text>
      <text x={MID_X + BAR_MAX + 12} y={PAD + 14} textAnchor="middle" className="book-head">
        ask qty
      </text>
      <line x1={PAD} y1={PAD + 22} x2={W - PAD} y2={PAD + 22} stroke="var(--edge)" />

      {asksTop.map((l, i) => (
        <g key={`a${l.px}`}>
          <text x={MID_X} y={yAsk(i) + 4} textAnchor="middle" className="book-price">
            {l.px}
          </text>
          <rect
            x={MID_X + 40}
            y={yAsk(i) - 8}
            width={(l.qty / maxQty) * BAR_MAX}
            height={16}
            rx={3}
            fill={askColor}
            opacity={0.85}
          />
          <text x={MID_X + 46 + (l.qty / maxQty) * BAR_MAX} y={yAsk(i) + 4} className="book-qty">
            {l.qty}
          </text>
        </g>
      ))}

      <g>
        <line x1={PAD} y1={yMid + ROW / 2} x2={W - PAD} y2={yMid + ROW / 2} stroke="var(--edge)" strokeDasharray="5 5" />
        <text x={MID_X} y={yMid + 4} textAnchor="middle" className="book-mid">
          {`mid ${
            data.bids.length && data.asks.length
              ? ((data.bids[0].px + data.asks[0].px) / 2).toFixed(2)
              : '—'
          }`}
        </text>
      </g>

      {bids.map((l, i) => (
        <g key={`b${l.px}`}>
          <text x={MID_X} y={yBid(i) + 4} textAnchor="middle" className="book-price">
            {l.px}
          </text>
          <rect
            x={MID_X - 40 - (l.qty / maxQty) * BAR_MAX}
            y={yBid(i) - 8}
            width={(l.qty / maxQty) * BAR_MAX}
            height={16}
            rx={3}
            fill={bidColor}
            opacity={0.85}
          />
          <text
            x={MID_X - 46 - (l.qty / maxQty) * BAR_MAX}
            y={yBid(i) + 4}
            textAnchor="end"
            className="book-qty"
          >
            {l.qty}
          </text>
        </g>
      ))}

      {data.last && (
        <text x={W - PAD} y={H - 8} textAnchor="end" className="book-last">
          last: {data.last.qty} @ {data.last.px} ({data.last.side})
        </text>
      )}
      {data.trades.length > 0 && (
        <text x={PAD} y={H - 8} className="book-last">
          {`${data.trades.length} trades`}
        </text>
      )}
    </svg>
  );
}
