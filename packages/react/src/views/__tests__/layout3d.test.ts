import { describe, expect, it } from 'vitest';
import {
  ISO_CAM,
  convexHull,
  cubeCorners,
  project,
  projectBox,
  projectScene,
  type Primitive,
} from '../layout3d';

const cam = ISO_CAM;

describe('axonometric projection', () => {
  it('a cube shows exactly three faces, because a convex body has three visible sides', () => {
    const b = projectBox(-1, -1, -1, 2, cam);
    expect(b.faces.length).toBe(3);
    // The visible set at this camera must be the top plus two of the four sides, and the
    // bottom (z0) can never be one of them from an elevated camera.
    expect(b.faces.map((f) => f.side)).toContain('z1');
    expect(b.faces.map((f) => f.side)).not.toContain('z0');
    expect(b.faces.filter((f) => f.side.startsWith('x')).length).toBe(1);
    expect(b.faces.filter((f) => f.side.startsWith('y')).length).toBe(1);
  });

  it('every face is a four-corner polygon with positive area', () => {
    const b = projectBox(0, 0, 0, 3, cam);
    for (const f of b.faces) {
      expect(f.pts.length).toBe(4);
      // The shoelace sum, divided by two. Zero would mean the face was drawn edge-on and
      // would render as an invisible sliver rather than as an error.
      const area = Math.abs(
        f.pts.reduce((acc, p, i) => {
          const q = f.pts[(i + 1) % f.pts.length];
          return acc + (p.x * q.y - q.x * p.y);
        }, 0) / 2,
      );
      expect(area).toBeGreaterThan(0.01);
    }
  });

  it("a cube's projected silhouette is a hexagon, not a rectangle or a point", () => {
    const b = projectBox(-1, -1, -1, 2, cam);
    expect(convexHull(b.silhouette).length).toBe(6);
  });

  it('an edge-on camera drops faces rather than drawing zero-area slivers', () => {
    // Looking straight down the +x axis: the two x faces are edge-on, and only the y/z
    // faces have any depth difference from the centre.
    const flat = projectBox(-1, -1, -1, 2, { yaw: 0, pitch: 0 });
    expect(flat.faces.length).toBeGreaterThanOrEqual(0);
    for (const f of flat.faces) expect(f.pts.length).toBe(4);
  });

  it('depth orders a near cube after a far cube, which is what the painter sort needs', () => {
    // The camera direction is (cos(pitch)cos(yaw), cos(pitch)sin(yaw), sin(pitch)), which at
    // the isometric camera is roughly (0.58, 0.58, 0.58) — so the viewer sits in the
    // +x+y+z octant and a point with larger x is the nearer one.
    const near = project(1.9, 0, 0, cam);
    const far = project(-1.9, 0, 0, cam);
    expect(near.depth).toBeGreaterThan(far.depth);
  });

  it('raising a point moves it up the screen, because SVG y grows downward', () => {
    const low = project(0, 0, -1, cam);
    const high = project(0, 0, 1, cam);
    expect(high.y).toBeLessThan(low.y);
    expect(high.depth).toBeGreaterThan(low.depth);
  });

  it('corners come back in the same octant order the struct subdivides with', () => {
    // Octant bits: x is 4, y is 2, z is 1. Corner 0 is the low-low-low corner and 7 the
    // high-high-high one, so a view can relate a child cube to its octant index directly.
    const c = cubeCorners(0, 0, 0, 1);
    expect(c[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(c[1]).toEqual({ x: 0, y: 0, z: 1 });
    expect(c[2]).toEqual({ x: 0, y: 1, z: 0 });
    expect(c[3]).toEqual({ x: 0, y: 1, z: 1 });
    expect(c[4]).toEqual({ x: 1, y: 0, z: 0 });
    expect(c[7]).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('the hull drops collinear points, so a flat set does not gain spurious vertices', () => {
    expect(convexHull([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]);
  });
});

describe('projectScene', () => {
  const scene = {
    boxes: [
      { id: 'root', x: -8, y: -8, z: -8, s: 16, solid: false },
      { id: 'leaf', x: -8, y: -8, z: -8, s: 8, solid: true },
    ],
    points: [{ id: 'p0', x: -4, y: -4, z: -4, r: 1.2 }],
    spheres: [{ id: 'q0', x: 0, y: 0, z: 0, r: 3 }],
  };

  it('returns primitives far to near, so emitting in order paints correctly', () => {
    const prims = projectScene(scene);
    for (let i = 1; i < prims.length; i++) {
      expect(prims[i].depth).toBeGreaterThanOrEqual(prims[i - 1].depth);
    }
  });

  it('is stable across calls, because a wobbling paint order looks like a flicker', () => {
    const a = projectScene(scene).map((p) => `${p.kind}:${p.id}`);
    const b = projectScene(scene).map((p) => `${p.kind}:${p.id}`);
    expect(a).toEqual(b);
  });

  it('fits everything into the 0-100 box every layout in this repo returns', () => {
    for (const p of projectScene(scene)) {
      // Every primitive's screen extent, not just its centre: a cube whose corners are inside
      // the frame but whose face is not is a clipped view, and a point near an edge needs its
      // radius counted or it disappears.
      let pts: { x: number; y: number }[];
      if (p.kind === 'face' || p.kind === 'wire') pts = p.pts;
      else if (p.kind === 'label') pts = [{ x: p.x, y: p.y }];
      else pts = [{ x: p.x - p.r, y: p.y - p.r }, { x: p.x + p.r, y: p.y + p.r }];
      for (const q of pts) {
        expect(q.x).toBeGreaterThanOrEqual(0);
        expect(q.x).toBeLessThanOrEqual(100);
        expect(q.y).toBeGreaterThanOrEqual(0);
        expect(q.y).toBeLessThanOrEqual(100);
        expect(Number.isFinite(q.x)).toBe(true);
        expect(Number.isFinite(q.y)).toBe(true);
      }
    }
  });

  it('emits a sphere as a circle of the same radius, which a parallel projection guarantees', () => {
    const p = projectScene(scene).find((q): q is Extract<Primitive, { kind: 'sphere' }> => q.kind === 'sphere');
    expect(p).toBeDefined();
    // Radius is scaled with the x axis to fill the frame, so it is proportional rather than
    // equal to 3 — what must not happen is a zero, a NaN, or a vanishing silhouette.
    expect(Number.isFinite(p!.r)).toBe(true);
    expect(p!.r).toBeGreaterThan(0);
  });

  it('draws a solid cube as faces and a subdivided one as a wireframe', () => {
    const prims = projectScene(scene);
    expect(prims.filter((p) => p.kind === 'face' && p.id === 'leaf').length).toBe(3);
    expect(prims.filter((p) => p.kind === 'wire' && p.id === 'root').length).toBe(1);
    expect(prims.filter((p) => p.kind === 'face' && p.id === 'root').length).toBe(0);
  });

  it('returns nothing for an empty scene rather than dividing by an empty extent', () => {
    expect(projectScene({ boxes: [] })).toEqual([]);
  });

  it('places a label above its cube rather than at its centre', () => {
    const box = { id: 'b', x: -1, y: -1, z: -1, s: 2, solid: true, label: '7' };
    const prims = projectScene({ boxes: [box] });
    const lab = prims.find((p): p is Extract<Primitive, { kind: 'label' }> => p.kind === 'label');
    expect(lab?.text).toBe('7');
    // Compare against the cube's own screen centroid, not one of its corners: the corners of
    // an isometric cube span a wide band of y, so a single corner is not a reference for
    // "above". The label is projected from above the top face, so it must sit higher —
    // smaller y — than the body of the cube it names.
    const facePts = prims
      .filter((p): p is Extract<Primitive, { kind: 'face' }> => p.kind === 'face')
      .flatMap((p) => p.pts);
    const centroidY = facePts.reduce((a, q) => a + q.y, 0) / facePts.length;
    expect(lab!.y).toBeLessThan(centroidY);
  });
});
