import type { StringData } from '@algoplot/core';
import { colorOf } from './palette';

function matchColor(data: StringData, i: number): string | null | undefined {
  for (const s of data.matches) {
    if (i >= s && i < s + data.pattern.length) return 'match';
  }
  return undefined;
}

export function StringView({ data }: { data: StringData }) {
  const textChars = data.text.split('');
  const patChars = data.pattern.split('');
  return (
    <div className="string-view">
      <div className="string-caption">text</div>
      <div className="string-row">
        {textChars.map((ch, i) => {
          const c = data.tmpT[i] ?? data.tColors[i] ?? matchColor(data, i);
          return (
            <span key={i} className={`scell${c ? ' scolored' : ''}`} style={{ backgroundColor: colorOf(c) }}>
              {ch}
            </span>
          );
        })}
      </div>
      {data.pattern.length > 0 && (
        <>
          <div className="string-caption">pattern (offset {data.offset})</div>
          <div className="string-row string-pattern" style={{ marginLeft: `calc(${data.offset} * var(--cellw))` }}>
            {patChars.map((ch, i) => {
              const c = data.tmpP[i] ?? data.pColors[i];
              return (
                <span key={i} className={`scell${c ? ' scolored' : ''}`} style={{ backgroundColor: colorOf(c) }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </>
      )}
      <div className="string-matches">
        {data.matches.length > 0
          ? `matches at: ${data.matches.join(', ')}`
          : data.matches.length === 0 && data.text.length > 0
            ? 'no matches yet'
            : ''}
      </div>
    </div>
  );
}
