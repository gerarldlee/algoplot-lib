import type { GraphData } from '@algoplot/core';
import { graphLayout } from './layout';
import { colorOf } from './palette';

const W = 600;
const H = 400;

export function GraphView({ data }: { data: GraphData }) {
  const pos = graphLayout(data.nodes);
  const byId = new Map(pos.map((p) => [p.id, p]));
  const pathEdges = new Set<string>();
  if (data.path) {
    for (let i = 0; i + 1 < data.path.length; i++) {
      const a = data.path[i];
      const b = data.path[i + 1];
      pathEdges.add(data.directed ? `${a}\u2192${b}` : [a, b].sort().join('\u2013'));
    }
  }
  const key = (u: string, v: string) => (data.directed ? `${u}\u2192${v}` : [u, v].sort().join('\u2013'));

  return (
    <svg className="graph-view" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: 'var(--edge)' }} />
        </marker>
        <marker id="arrow-path" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
        </marker>
      </defs>
      {data.edges.map((e) => {
        const a = byId.get(e.u);
        const b = byId.get(e.v);
        if (!a || !b) return null;
        const k = key(e.u, e.v);
        const onPath = pathEdges.has(k);
        const tmp = data.tmpEdges.includes(k);
        const color = tmp ? colorOf('tmp') : onPath ? colorOf('path') : colorOf(data.edgeColor[k]);
        const ax = a.x * (W / 100);
        const ay = a.y * (H / 100);
        const bx = b.x * (W / 100);
        const by = b.y * (H / 100);
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const pad = 20;
        const x1 = ax + (dx / len) * pad;
        const y1 = ay + (dy / len) * pad;
        const x2 = bx - (dx / len) * pad;
        const y2 = by - (dy / len) * pad;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={k}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{ stroke: color ?? 'var(--edge)' }}
              strokeWidth={onPath || tmp ? 4 : 2}
              markerEnd={data.directed ? (onPath || tmp ? 'url(#arrow-path)' : 'url(#arrow)') : undefined}
            />
            {data.weighted && e.w !== undefined && (
              <text x={mx} y={my - 5} textAnchor="middle" className="edge-weight">
                {e.w}
              </text>
            )}
            {data.edgeLabel[k] && (
              <text x={mx} y={my + 16} textAnchor="middle" className="edge-text">
                {data.edgeLabel[k]}
              </text>
            )}
          </g>
        );
      })}
      {data.nodes.map((n) => {
        const p = byId.get(n.id);
        if (!p) return null;
        const x = p.x * (W / 100);
        const y = p.y * (H / 100);
        const isTmp = data.tmpNodes.includes(n.id);
        const isPath = data.path?.includes(n.id);
        const c = isTmp ? colorOf('tmp') : isPath ? colorOf('path') : colorOf(data.nodeColor[n.id]);
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r={18} style={{ fill: c ?? 'var(--node-fill)', stroke: c ?? 'var(--node-stroke)' }} strokeWidth={2} />
            <text x={x} y={y + 4} textAnchor="middle" className="node-label">
              {n.id}
            </text>
            {data.nodeLabel[n.id] && (
              <text x={x} y={y + 32} textAnchor="middle" className="node-attr">
                {data.nodeLabel[n.id]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
