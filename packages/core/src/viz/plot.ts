import type { Recorder } from '../recorder';
import { Struct } from './base';

export type PlotPoint = { x: number; y: number; c: string | null; label?: string };
export type PlotPoly = { id: string; pts: [number, number][]; c: string | null; dash?: boolean };
export type PlotCircle = { x: number; y: number; r: number; c: string | null; label?: string };
export type PlotText = { x: number; y: number; s: string; c: string | null };

export type PlotData = {
  type: 'plot';
  name: string;
  domain: { xmin: number; xmax: number; ymin: number; ymax: number };
  points: PlotPoint[];
  polys: PlotPoly[];
  circles: PlotCircle[];
  texts: PlotText[];
  trail: [number, number][];
};

export class VizPlot extends Struct {
  declare readonly data: PlotData;

  constructor(rec: Recorder, id: string, name = 'plot') {
    const data: PlotData = {
      type: 'plot',
      name,
      domain: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
      points: [],
      polys: [],
      circles: [],
      texts: [],
      trail: [],
    };
    super(rec, id, data);
  }

  domain(xmin: number, xmax: number, ymin: number, ymax: number, msg?: string): void {
    this.data.domain = { xmin, xmax, ymin, ymax };
    this.record(msg ?? `domain x∈[${xmin}, ${xmax}] y∈[${ymin}, ${ymax}]`);
  }

  point(x: number, y: number, c: string | null = 'focus', label?: string, msg?: string): void {
    this.data.points.push(label === undefined ? { x, y, c } : { x, y, c, label });
    this.record(msg ?? `point (${fmt(x)}, ${fmt(y)})${label ? ` ${label}` : ''}`);
  }

  clearPoints(msg?: string): void {
    this.data.points = [];
    this.record(msg ?? 'clear points');
  }

  curve(id: string, fn: (x: number) => number, c: string | null = 'focus', samples = 80, msg?: string): void {
    const { xmin, xmax } = this.data.domain;
    const pts: [number, number][] = [];
    for (let i = 0; i <= samples; i++) {
      const x = xmin + ((xmax - xmin) * i) / samples;
      const y = fn(x);
      if (Number.isFinite(y)) pts.push([x, clampY(y, this.data.domain)]);
    }
    this.replacePoly(id, pts, c, false, msg ?? `curve ${id} (${pts.length} pts)`);
  }

  line(id: string, a: [number, number], b: [number, number], c: string | null = 'focus', msg?: string): void {
    this.replacePoly(id, [a, b], c, true, msg ?? `line ${id}`);
  }

  private replacePoly(id: string, pts: [number, number][], c: string | null, dash: boolean, msg?: string): void {
    const ex = this.data.polys.find((p) => p.id === id);
    if (ex) {
      ex.pts = pts;
      ex.c = c;
      ex.dash = dash;
    } else {
      this.data.polys.push({ id, pts, c, dash });
    }
    this.record(msg);
  }

  circle(x: number, y: number, r: number, c: string | null = 'focus', label?: string, msg?: string): void {
    this.data.circles.push(label === undefined ? { x, y, r, c } : { x, y, r, c, label });
    this.record(msg ?? `circle at (${fmt(x)}, ${fmt(y)}) r=${r}`);
  }

  clearCircles(msg?: string): void {
    this.data.circles = [];
    this.record(msg ?? 'clear circles');
  }

  text(x: number, y: number, s: string, c: string | null = null, msg?: string): void {
    this.data.texts.push({ x, y, s, c });
    this.record(msg ?? `label (${fmt(x)}, ${fmt(y)}): ${s}`);
  }

  clearTexts(msg?: string): void {
    this.data.texts = [];
    this.record(msg ?? 'clear labels');
  }

  step(x: number, y: number, msg?: string): void {
    this.data.trail.push([x, y]);
    this.record(msg ?? `step → (${fmt(x)}, ${fmt(y)})`);
  }

  clearTrail(msg?: string): void {
    this.data.trail = [];
    this.record(msg ?? 'clear trail');
  }
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

function clampY(y: number, d: PlotData['domain']): number {
  const span = d.ymax - d.ymin;
  return Math.min(d.ymax + span * 0.2, Math.max(d.ymin - span * 0.2, y));
}
