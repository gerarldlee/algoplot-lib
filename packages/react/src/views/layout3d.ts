/**
 * Axonometric projection for the octree view.
 *
 * An axonometric projection maps a 3-D point to 2-D while keeping parallel lines parallel —
 * there is no camera and no perspective convergence, which is exactly why it suits this
 * repo: the result is plain SVG geometry that scales through a `viewBox` like every other
 * view, so it needs no size measurement and stays unit-testable with `renderToString`.
 *
 * `yaw` and `pitch` are plain numbers rather than fixed constants, so a draggable camera
 * later is a `useState` and two arguments rather than a rewrite. Nothing here is stateful
 * and nothing imports React, for the same reason `layout.ts` is that way.
 *
 * Depth is the third output of every projection and it is what the painter's algorithm in
 * the view sorts on: SVG paints later elements on top, so emitting primitives far-to-near
 * gets occlusion for free.
 */

export interface Pt2 {
  x: number;
  y: number;
}

/** A point in the volume. Kept distinct from `Pt2` so a screen point cannot be read as a world one. */
export interface Pt3 {
  x: number;
  y: number;
  z: number;
}

/** A projected point plus how far up the view axis it sits. Larger `depth` is nearer. */
export interface Projected extends Pt2 {
  depth: number;
}

/** The camera. `yaw` turns about the vertical axis; `pitch` is the elevation in radians. */
export interface Cam {
  yaw: number;
  pitch: number;
}

/**
 * The classic isometric view: a 45-degree yaw and a 35.264-degree elevation, which is the
 * angle at which all three axes are foreshortened equally — so a cube's three edges leave
 * any corner at the same length and the shape reads as a cube rather than a smear.
 */
export const ISO_CAM: Cam = {
  yaw: Math.PI / 4,
  pitch: Math.atan(1 / Math.SQRT2),
};

/**
 * Project one point.
 *
 * Two rotations, in this order: `yaw` about the vertical axis, then `pitch` about the
 * screen's horizontal. The intermediate `h` is the coordinate *along* the view direction and
 * `r` is the coordinate across it, so `depth` and `y` are the two combinations of `h` and
 * `z` with sin/cos of the elevation.
 *
 * Screen y grows downward (SVG's convention), which is why the `z` term is subtracted in
 * `y` and added in `depth`: a point higher in the world belongs higher on the screen.
 */
export function project(x: number, y: number, z: number, cam: Cam): Projected {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const h = x * cy + y * sy; // along the view axis
  const r = -x * sy + y * cy; // across it, screen-right
  return { x: r, y: sp * h - cp * z, depth: cp * h + sp * z };
}

/**
 * The eight corners of an axis-aligned cube, in the octant order `VizOctree.subdivide`
 * uses — bit 2 is x, bit 1 is y, bit 0 is z, so corner 0 is the low corner and corner 7 the
 * high one. Reusing that order means a node's octant `i` is exactly corner `i`, so a view
 * can relate a cube to its child without a second convention.
 */
export function cubeCorners(x: number, y: number, z: number, s: number): Pt3[] {
  const out: Pt3[] = [];
  for (let i = 0; i < 8; i++) {
    out.push({ x: x + (i & 4 ? s : 0), y: y + (i & 2 ? s : 0), z: z + (i & 1 ? s : 0) });
  }
  return out;
}

/**
 * The six faces, as four corner indices each plus the axis they are perpendicular to.
 *
 * Each face's corners wind the same way round the face, so a projection that happens to
 * flip one of them would show up as a self-intersecting polygon rather than as a subtly
 * wrong shape.
 */
const FACES: { axis: 'x' | 'y' | 'z'; atMax: boolean; corners: number[] }[] = [
  { axis: 'z', atMax: false, corners: [0, 2, 6, 4] },
  { axis: 'z', atMax: true, corners: [1, 5, 7, 3] },
  { axis: 'y', atMax: false, corners: [0, 4, 5, 1] },
  { axis: 'y', atMax: true, corners: [2, 6, 7, 3] },
  { axis: 'x', atMax: false, corners: [0, 2, 3, 1] },
  { axis: 'x', atMax: true, corners: [4, 6, 7, 5] },
];

/** A face's centre, as an offset in units of the cube's side. */
const FACE_CENTRES: Record<string, Pt3> = {
  'z0': { x: 0.5, y: 0.5, z: 0 },
  'z1': { x: 0.5, y: 0.5, z: 1 },
  'y0': { x: 0.5, y: 0, z: 0.5 },
  'y1': { x: 0.5, y: 1, z: 0.5 },
  'x0': { x: 0, y: 0.5, z: 0.5 },
  'x1': { x: 1, y: 0.5, z: 0.5 },
};

/** A projected cube: its visible faces and the silhouette a wireframe would draw. */
export interface ProjectedBox {
  faces: { side: string; pts: Pt2[] }[];
  silhouette: Pt2[];
  depth: number;
}

/**
 * Project one cube, keeping only the faces turned toward the camera.
 *
 * A face counts as visible when its centre is nearer than the cube's own centre. For a
 * convex body under a parallel projection that yields exactly three faces, and it stays
 * correct at any `yaw`/`pitch` — including the degenerate ones, where an edge-on face falls
 * to the same depth as the centre and is correctly dropped rather than drawn as a zero-area
 * sliver.
 */
export function projectBox(x: number, y: number, z: number, s: number, cam: Cam): ProjectedBox {
  const corners = cubeCorners(x, y, z, s);
  const proj = corners.map((c) => project(c.x, c.y, c.z, cam));
  const centre = project(x + s / 2, y + s / 2, z + s / 2, cam);

  const faces: { side: string; pts: Pt2[] }[] = [];
  for (const f of FACES) {
    const fc = FACE_CENTRES[`${f.axis}${f.atMax ? 1 : 0}`];
    const faceDepth = project(x + fc.x * s, y + fc.y * s, z + fc.z * s, cam).depth;
    if (faceDepth <= centre.depth) continue;
    faces.push({
      side: `${f.axis}${f.atMax ? '1' : '0'}`,
      pts: f.corners.map((i) => ({ x: proj[i].x, y: proj[i].y })),
    });
  }

  // Depth for sorting is the mean of the corners. A cube's centre would be more accurate for
  // a single convex solid, but a subdivided octree draws several boxes that overlap in depth
  // and the mean tracks the box's screen area, which is the ordering a reader perceives.
  const depth = proj.reduce((a, p) => a + p.depth, 0) / proj.length;
  return { faces, silhouette: proj.map((p) => ({ x: p.x, y: p.y })), depth };
}

/**
 * The convex hull of the projected corners — the outline of a cube seen from outside.
 *
 * Used for the wireframe of a subdivided cube. Drawing all twelve edges instead would be
 * more literal and considerably worse to look at: an octree draws nested boxes, and twelve
 * edges per box turns four levels of subdivision into a thicket. The hull is what actually
 * reads as "a box".
 */
export function convexHull(pts: Pt2[]): Pt2[] {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt2, a: Pt2, b: Pt2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (src: Pt2[]): Pt2[] => {
    const out: Pt2[] = [];
    for (const q of src) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out;
  };
  const lower = build(p);
  const upper = build(p.slice().reverse());
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** A cube to draw. `solid` draws shaded faces; otherwise only the wireframe silhouette. */
export interface SceneBox {
  id: string;
  x: number;
  y: number;
  z: number;
  s: number;
  solid: boolean;
  /** Text drawn at the cube's centre, if any. */
  label?: string;
  labelDy?: number;
}

export interface ScenePoint {
  id: string;
  x: number;
  y: number;
  z: number;
  /**
   * Radius in **screen** units (the same 0-100 space everything else lands in), not world
   * units. A point is a dot: it has no physical size, so scaling its radius by the scene would
   * make a dot in a small scene enormous and a dot in a large one invisible.
   */
  r: number;
  /** Palette name or null. Carried through the projection so the view need not match up. */
  c?: string | null;
}

export interface SceneSphere {
  id: string;
  x: number;
  y: number;
  z: number;
  r: number;
  c?: string | null;
}

/**
 * One drawable, already projected and already in 0-100 screen space.
 *
 * `kind` is discriminated rather than typed per variant so the view can switch on it, which
 * is the same shape as the other views' elements — and so the scene comes back as a single
 * flat list, because the painter's algorithm needs every primitive in one order and sorting
 * four separate lists by depth in the view would be four chances to get the tie-break wrong.
 *
 * Every variant carries its own `id` and its own colour name. Both are copied through the
 * projection rather than left behind: matching a projected primitive back to its source by
 * position or by array index would put the wrong colour on the wrong cube the moment two of
 * them coincided, which is precisely what a query traversal arranges.
 */
export type Primitive =
  | { kind: 'face'; id: string; side: string; pts: Pt2[]; depth: number }
  | { kind: 'wire'; id: string; pts: Pt2[]; depth: number }
  | { kind: 'point'; id: string; x: number; y: number; r: number; c: string | null; depth: number }
  | { kind: 'sphere'; id: string; x: number; y: number; r: number; c: string | null; depth: number }
  | { kind: 'label'; id: string; text: string; x: number; y: number; depth: number };

export interface Scene {
  boxes: SceneBox[];
  points?: ScenePoint[];
  spheres?: SceneSphere[];
}

/**
 * Project a whole scene, fit it to the 0-100 box every layout in this repo returns, and
 * return the primitives ordered far to near.
 *
 * Fitting is over everything that occupies screen space, including each sphere's radius, so
 * a query sphere near the edge of the volume is not clipped by the frame. The pad leaves
 * room for stroke width and for a label sitting on the topmost cube.
 */
export function projectScene(scene: Scene, cam: Cam = ISO_CAM, pad = 6): Primitive[] {
  const boxes = scene.boxes.map((b) => ({ b, p: projectBox(b.x, b.y, b.z, b.s, cam) }));
  const pts = (scene.points ?? []).map((p) => ({ p, q: project(p.x, p.y, p.z, cam) }));
  const sph = (scene.spheres ?? []).map((s) => ({ s, q: project(s.x, s.y, s.z, cam) }));

  // The extent of the fit, from every corner and every point plus each sphere's radius. A
  // sphere is a circle on screen under a parallel projection, so its silhouette is a circle
  // of exactly the same radius — there is no approximation here and no need for one.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const { p } of boxes) for (const c of p.silhouette) { xs.push(c.x); ys.push(c.y); }
  for (const { q } of pts) { xs.push(q.x); ys.push(q.y); }
  for (const { s, q } of sph) { xs.push(q.x - s.r, q.x + s.r); ys.push(q.y - s.r, q.y + s.r); }
  if (xs.length === 0) return [];

  // **One scale for both axes, then centre.** An axonometric projection foreshortens all three
  // world axes by the same amount, and that ratio is the whole reason a cube reads as a cube.
  // Fitting x and y independently would stretch the result into a rectangular prism — which
  // looks plausible on screen and silently reports the wrong geometry, since a face that is
  // drawn non-square is no longer the face the projection computed. So the smaller of the two
  // scales wins and the slack axis is centred.
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = (100 - 2 * pad) / Math.max(1e-9, maxX - minX, maxY - minY);
  const offsetX = (100 - (maxX - minX) * k) / 2;
  const offsetY = (100 - (maxY - minY) * k) / 2;
  const fx = (v: number) => offsetX + (v - minX) * k;
  const fy = (v: number) => offsetY + (v - minY) * k;

  const out: Primitive[] = [];
  for (const { b, p } of boxes) {
    if (b.solid) {
      for (const f of p.faces) {
        out.push({ kind: 'face', id: b.id, side: f.side, pts: f.pts.map((q) => ({ x: fx(q.x), y: fy(q.y) })), depth: p.depth });
      }
    } else {
      const hull = convexHull(p.silhouette).map((q) => ({ x: fx(q.x), y: fy(q.y) }));
      // Drop a degenerate hull: two coincident corners project to the same screen point, and
      // a two-point polygon is an invisible sliver rather than an error.
      if (hull.length >= 3) out.push({ kind: 'wire', id: b.id, pts: hull, depth: p.depth });
    }
    if (b.label !== undefined && b.label !== '') {
      const c = project(b.x + b.s / 2, b.y + b.s / 2, b.z + b.s + b.s * 0.12, cam);
      out.push({ kind: 'label', id: b.id, text: b.label, x: fx(c.x), y: fy(c.y), depth: c.depth });
    }
  }
  for (const { p, q } of pts) {
    out.push({ kind: 'point', id: p.id, x: fx(q.x), y: fy(q.y), r: p.r, c: p.c ?? null, depth: q.depth });
  }
  for (const { s, q } of sph) {
    out.push({ kind: 'sphere', id: s.id, x: fx(q.x), y: fy(q.y), r: s.r * k, c: s.c ?? null, depth: q.depth });
  }

  // Far to near. Depth is a float sum over projected corners, so equal values are possible
  // for coincident boxes; breaking the tie on id keeps the order total and therefore stable
  // across a replay, which matters because a view whose paint order wobbles between two
  // identical states looks like a flicker.
  out.sort((a, c) => a.depth - c.depth || (a.id < c.id ? -1 : a.id > c.id ? 1 : 0));
  return out;
}
