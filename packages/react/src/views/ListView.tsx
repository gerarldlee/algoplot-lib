import { Fragment } from 'react';
import type { ListData } from '@algoplot/core';
import { colorOf } from './palette';

export function ListView({ data }: { data: ListData }) {
  return (
    <div className="list-view">
      {data.values.map((v, i) => {
        const ptrs = data.ptr.filter((p) => p.i === i);
        const color = data.tmp[i] ?? data.colors[i];
        return (
          <Fragment key={i}>
            <div className="list-node-wrap">
              <div className="list-pointers">
                {ptrs.map((p) => (
                  <span key={p.name} className="list-ptr">
                    {p.name} ▲
                  </span>
                ))}
              </div>
              <div
                className={`list-node${color ? ' node-colored' : ''}`}
                style={{ backgroundColor: colorOf(color) }}
              >
                {String(v)}
              </div>
              <span className="list-index">{i}</span>
            </div>
            {i < data.values.length - 1 && (
              <div className={data.doubly ? 'list-arrow list-arrow-doubly' : 'list-arrow'}>
                {data.doubly ? '⇄' : '→'}
              </div>
            )}
          </Fragment>
        );
      })}
      <div className="list-null">∅</div>
    </div>
  );
}
