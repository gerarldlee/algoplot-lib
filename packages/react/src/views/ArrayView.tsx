import type { ArrayData } from '@algoplot/core';
import { colorOf } from './palette';

export function ArrayView({ data }: { data: ArrayData }) {
  const n = data.values.length;
  const nums = data.values.filter((v): v is number => typeof v === 'number');
  const max = nums.length ? Math.max(...nums.map(Math.abs), 1) : 1;
  const rangeRow: { key: string; flex: number; c?: string; label?: string }[] = [];
  if (data.ranges.length && n > 0) {
    const sorted = [...data.ranges].sort((a, b) => a.lo - b.lo);
    let cursor = 0;
    for (const r of sorted) {
      if (r.lo > cursor) rangeRow.push({ key: `g${cursor}`, flex: r.lo - cursor });
      rangeRow.push({ key: `${r.c}-${r.lo}`, flex: r.hi - r.lo + 1, c: r.c, label: r.label });
      cursor = r.hi + 1;
    }
    if (cursor < n) rangeRow.push({ key: `g${cursor}`, flex: n - cursor });
  }

  return (
    <div className="array-view">
      {rangeRow.length > 0 && (
        <div className="array-ranges">
          {rangeRow.map((r) => (
            <div
              key={r.key}
              className={r.c ? 'range-cell ranged' : 'range-cell'}
              style={{ flex: r.flex, backgroundColor: r.c ? colorOf(r.c) : undefined }}
            >
              {r.label}
            </div>
          ))}
        </div>
      )}
      <div className="array-bars">
        {data.values.map((v, i) => {
          const color = data.tmp[i] ?? data.colors[i];
          const h = typeof v === 'number' ? Math.max(4, (Math.abs(v) / max) * 100) : 30;
          return (
            <div className="slot" key={i}>
              <div className="slot-value">{String(v)}</div>
              <div
                className={`bar${color ? ' bar-colored' : ''}`}
                style={{ height: `${h}%`, backgroundColor: colorOf(color) }}
              />
              <div className="slot-index">{i}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
