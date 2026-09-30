import type { MatrixData } from '@algoplot/core';
import { colorOf } from './palette';

function lerpHex(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function linearColor(t: number): string {
  // deep blue → cyan → pale yellow
  if (t < 0.6) return lerpHex([13, 58, 110], [56, 189, 248], t / 0.6);
  return lerpHex([56, 189, 248], [253, 230, 138], (t - 0.6) / 0.4);
}

export function MatrixView({ data }: { data: MatrixData }) {
  const rows = data.values.length;
  const cols = data.values[0]?.length ?? 0;

  let min = Infinity;
  let max = -Infinity;
  if (data.scale === 'linear') {
    for (const row of data.values) {
      for (const v of row) {
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1;
    }
    if (min === max) max = min + 1;
  }

  return (
    <div className="matrix-view">
      <table className="matrix-table">
        <thead>
          <tr>
            <th className="corner" />
            {/* Driven by `cols`, not by colLabels.length: VizMatrix.cols reads
                values[0].length, so a template that writes past the end of a row it
                built with fewer columns grows the table but not its header row - and
                the data lands outside the thead entirely. `cols` also stops a short
                colLabels from misaligning the other way. Mirrors the rowLabels guard
                below. */}
            {Array.from({ length: cols }, (_, c) => (
              <th key={c}>
                {data.colMix && (
                  <div className="mixbar-v">
                    <div className="mixbar-fill" style={{ width: `${(data.colMix?.[c] ?? 0) * 100}%`, backgroundColor: colorOf('focus') }} />
                  </div>
                )}
                <span>{data.colLabels?.[c] ?? `c${c}`}</span>
                {data.colMix && <em>{(data.colMix[c] * 100).toFixed(0)}%</em>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <th className="rowhead">
                <span>{data.rowLabels?.[r] ?? `r${r}`}</span>
                {data.rowMix && <em>{(data.rowMix[r] * 100).toFixed(0)}%</em>}
                {data.rowMix && (
                  <div className="mixbar-h">
                    <div className="mixbar-fill" style={{ width: `${(data.rowMix[r] ?? 0) * 100}%`, backgroundColor: colorOf('best') }} />
                  </div>
                )}
              </th>
              {Array.from({ length: cols }, (_, c) => {
                const col = data.colors[`${r},${c}`];
                const v = data.values[r][c];
                const explicit = colorOf(col);
                const t =
                  data.scale === 'linear' && typeof v === 'number' && !explicit
                    ? (v - min) / (max - min)
                    : null;
                const bg = explicit ?? (t !== null ? linearColor(t) : undefined);
                const darkText = bg !== undefined && bg !== explicit && luminance(bg) > 0.62;
                const textColor =
                  t !== null && !explicit ? (darkText ? '#0f172a' : '#f8fafc') : undefined;
                return (
                  <td
                    key={c}
                    style={{
                      backgroundColor: bg,
                      color: textColor,
                    }}
                  >
                    {typeof v === 'number' && data.scale === 'linear'
                      ? Number.isInteger(v)
                        ? String(v)
                        : v.toFixed(2)
                      : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
