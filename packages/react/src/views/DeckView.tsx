import type { DeckData } from '@algoplot/core';
import { colorOf } from './palette';

export function DeckView({ data }: { data: DeckData }) {
  const isStack = data.kind === 'stack';
  const items = isStack ? [...data.items].reverse() : data.items; // stack: top first; queue: front first

  return (
    <div className={`deck-view deck-${data.kind}`}>
      <div className="deck-title">{data.name}</div>
      <div className="deck-row">
        {items.length === 0 && <div className="deck-empty">empty {data.kind}</div>}
        {items.map((it, displayIdx) => {
          const realIdx = isStack ? data.items.length - 1 - displayIdx : displayIdx;
          const isPtr = data.pointer === realIdx;
          const label = isStack ? (displayIdx === 0 ? 'top' : '') : displayIdx === 0 ? 'front' : displayIdx === data.items.length - 1 ? 'back' : '';
          return (
            <div className="deck-cell" key={realIdx}>
              <div className="deck-cell-label">{label}</div>
              <div
                className={`deck-box${it.c ? ' node-colored' : ''}${isPtr ? ' deck-peek' : ''}`}
                style={{ backgroundColor: colorOf(it.c) }}
              >
                {String(it.v)}
              </div>
              <div className="list-index">{realIdx}</div>
            </div>
          );
        })}
        {!isStack && items.length > 0 && <div className="deck-end">→</div>}
      </div>
    </div>
  );
}
