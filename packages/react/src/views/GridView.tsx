import type { GridData } from '@algoplot/core';
import { colorOf } from './palette';

export function GridView({ data }: { data: GridData }) {
  return (
    <div
      className="grid-view"
      style={{ gridTemplateColumns: `repeat(${data.w}, minmax(0, 1fr))` }}
    >
      {data.cells.map((cell, i) => {
        const x = i % data.w;
        const y = Math.floor(i / data.w);
        const c = data.tmp[`${x},${y}`] ?? cell.c;
        return (
          <div
            key={i}
            className={`gcell${cell.v ? ' filled' : ''}`}
            style={{ backgroundColor: colorOf(c) }}
          >
            {cell.v ?? ''}
          </div>
        );
      })}
    </div>
  );
}
