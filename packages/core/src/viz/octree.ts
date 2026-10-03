import type { Recorder } from '../recorder';
import { Struct } from './base';

/**
 * One axis-aligned cube. `x,y,z` is the minimum corner and `s` the side length, so the
 * node occupies `[x, x+s] x [y, y+s] x [z, z+s]`. Keeping the corner rather than a centre
 * plus a size is what lets a child offset be accumulated into its own origin — see
 * `split`, and the same trap documented in the quadtree template.
 *
 * `kids` is always 8 long once `split` has run, and an octant's origin is the parent
 * corner plus `octant` scaled by the half-side. An unbuilt octant is `null`, never
 * `undefined`: see the note in `split`.
 */
export interface OctNode {
  x: number;
  y: number;
  z: number;
  s: number;
  kids: (string | null)[];
  c: string | null;
  /**
   * Whether this cube is known to be final — it holds at most its capacity and will not be
   * subdivided again. The view draws a leaf solid and a subdivided cube as a wireframe, so
   * this is the whole of that distinction.
   *
   * It is a declared flag rather than `kids.length === 0`, because those are not the same
   * thing while a recording is playing: the root has no children at step 0 because nothing has
   * happened yet, not because it was found to hold a single point. Inferring it would draw the
   * unsubdivided root as an occupied cube, which claims the volume holds exactly one point.
   */
  lf: boolean;
  /** Optional text drawn beside the cube. */
  a?: string;
}

/**
 * A point in the volume. `c` is a palette name or null; null means "the default point
 * colour", which is deliberately different from the cube fill so a point stays visible
 * inside an occupied cube.
 */
export interface OctPoint {
  x: number;
  y: number;
  z: number;
  c: string | null;
}

/**
 * A query region. The octree template uses a sphere, and under a parallel projection a
 * sphere's silhouette is a circle of exactly the same radius — so this needs no
 * approximation in the view, only a circle.
 */
export interface OctSphere {
  x: number;
  y: number;
  z: number;
  r: number;
  c: string | null;
}

export type OctreeData = {
  type: 'octree';
  nodes: Record<string, OctNode>;
  root: string | null;
  colors: Record<string, string | null>;
  annot: Record<string, string>;
  counter: number;
  extent: number;
  points: OctPoint[];
  spheres: OctSphere[];
}

/**
 * A volumetric quadtree: the 3-D counterpart of `VizTree`, drawn as cubes rather than
 * circles.
 *
 * The struct stores geometry, not the subdivision algorithm. `VizTree` is the same way
 * round — it holds boxes and the links between them, and the template decides what the
 * tree means. So this class has no notion of a point, an octant, or a capacity: it knows
 * how to hold cubes and colour them, and the recursion belongs to the caller. That is what
 * keeps a template from reaching into `data` (see the proxy note in `bridge.py`) and what
 * makes the same struct reusable for anything that nests cubes.
 */
export class VizOctree extends Struct {
  declare readonly data: OctreeData;

  constructor(rec: Recorder, id: string, extent = 1) {
    const data: OctreeData = {
      type: 'octree',
      nodes: {},
      root: null,
      colors: {},
      annot: {},
      counter: 0,
      extent,
      points: [],
      spheres: [],
    };
    super(rec, id, data);
  }


  private must(id: string): OctNode {
    const n = this.data.nodes[id];
    if (!n) throw new Error(`unknown node: ${id}`);
    return n;
  }

  /** Create a cube from its minimum corner and side length. */
  cube(x: number, y: number, z: number, s: number, msg?: string): string {
    const id = `n${this.data.counter++}`;
    this.data.nodes[id] = { x, y, z, s, kids: [], c: null, lf: false };
    this.data.colors[id] = null;
    this.record(msg ?? `cube ${id} at (${x}, ${y}, ${z}) side ${s}`);
    return id;
  }

  /** The cube covering the whole extent, centred on the origin. */
  rootCube(msg?: string): string {
    const e = this.data.extent;
    const id = this.cube(-e / 2, -e / 2, -e / 2, e, 'the root cube, the whole volume');
    this.data.root = id;
    this.record(msg ?? `root ← ${id}`);
    return id;
  }

  setRoot(id: string | null, msg?: string): void {
    if (id !== null) this.must(id);
    this.data.root = id;
    this.record(msg ?? `root ← ${id ?? 'null'}`);
  }

  /**
   * Subdivide `parent`, building only the octants listed.
   *
   * Octant bits: x is bit 2, y is bit 1, z is bit 0, so octant 0 is the low-low-low corner
   * and 7 the high-high-high one. Reading them the other way round would draw a mirror image
   * rather than a wrong subdivision, which is a good deal harder to notice.
   *
   * A child's origin accumulates the parent's corner. Passing the bare half-offset would
   * place every cube below the first level back at the parent's origin and stack all eight
   * on top of each other — the same bug the quadtree template documents in `split`.
   *
   * **Octants that are not listed are `null` and no cube is created for them at all.** That
   * is the whole point of the structure — an empty region is never built — so building them
   * anyway and greying them would put a cube in the tree that no algorithm would ever visit,
   * and every count derived from `childrenOf` would then include a node that does not
   * exist. `subdivide` returning a fixed-length array with `null` in the gaps keeps the
   * octant index meaningful for the caller *and* keeps `size()` an honest count of real
   * cubes.
   *
   * The links are written in one recorded step because they are one subdivision: a caller
   * building them through eight separate `link` calls would emit eight steps for a single
   * conceptual operation.
   *
   * Unbuilt octants are `null`, never left absent. Python's `None` crosses the bridge as
   * JavaScript `undefined`, and `JSON.stringify` drops an undefined value where it keeps an
   * explicit null — so a port would produce a cube missing a key the JavaScript run has.
   * See the same note in `VizTree.setChildren`.
   */
  subdivide(parent: string, octants: number[], msg?: string): (string | null)[] {
    const p = this.must(parent);
    const h = p.s / 2;
    const kids: (string | null)[] = [null, null, null, null, null, null, null, null];
    const built: number[] = [];
    for (const i of octants) {
      if (!Number.isInteger(i) || i < 0 || i > 7) throw new Error(`octant out of range: ${i}`);
      if (kids[i] !== null) continue; // a repeated octant is a caller bug, not a second cube
      const id = `n${this.data.counter++}`;
      this.data.nodes[id] = {
        x: p.x + (i & 4 ? h : 0),
        y: p.y + (i & 2 ? h : 0),
        z: p.z + (i & 1 ? h : 0),
        s: h,
        kids: [],
        c: null,
        lf: false,
      };
      this.data.colors[id] = null;
      kids[i] = id;
      built.push(i);
    }
    p.kids = kids;
    this.record(
      msg ??
        `${parent} subdivides: ${built.length} of 8 octants built at side ${h}` +
          (built.length === 8 ? '' : `, ${8 - built.length} empty and not built`),
    );
    return kids.slice();
  }

  /** Replace one octant, for a caller that wants to build the children itself. */
  link(parent: string, octant: number, child: string | null, msg?: string): void {
    if (!Number.isInteger(octant) || octant < 0 || octant > 7) {
      throw new Error(`octant out of range: ${octant}`);
    }
    const p = this.must(parent);
    if (child !== null) this.must(child);
    p.kids[octant] = child;
    this.record(msg ?? `${parent}.octant[${octant}] ← ${child ?? 'null'}`);
  }

  /**
   * Declare a cube final: it holds at most its capacity and will not be subdivided.
   *
   * `subdivide` clears the flag, so the ordering between the two calls does not matter — a
   * cube marked final and then subdivided comes back as not final, which is the truth.
   *
   * The flag rather than `kids.length === 0` is deliberate, and the reason is playback. The
   * root has no children at step 0 because the program has not run yet, not because it was
   * found to hold one point, and a view that inferred the leaf from the absence of children
   * would draw the whole unsubdivided volume as an occupied cube — a claim about the data
   * that nothing in the recording supports.
   */
  leaf(id: string, msg?: string): void {
    const n = this.must(id);
    n.lf = true;
    this.record(msg ?? `${id} is a leaf: it holds at most its capacity, so it is never subdivided`);
  }

  color(id: string, c: string | null, msg?: string): void {
    this.must(id);
    this.data.colors[id] = c;
    this.record(msg ?? `color ${id}: ${c ?? 'clear'}`);
  }

  clearColors(msg?: string): void {
    for (const k of Object.keys(this.data.colors)) this.data.colors[k] = null;
    this.record(msg ?? 'clear colors');
  }

  /**
   * The transient colour tier is deliberately absent.
   *
   * `VizTree` and `VizGraph` both carry one, but nothing here needs it. An octree query
   * narrates the cubes it prunes and the cubes it descends through as *persistent* colours,
   * because that record is the point of the recording — and a transient highlight would be
   * wiped by the very next step, so it could not carry that record anyway. A tier with no
   * way to set it would be a colour that always resolved to the tier below it, which is
   * worse than not having one. `color` is the whole colour API here.
   */
  annotate(id: string, text: string, msg?: string): void {
    this.must(id);
    this.data.annot[id] = text;
    this.record(msg ?? `${id} annotated: ${text}`);
  }

  clearAnnots(msg?: string): void {
    this.data.annot = {};
    this.record(msg ?? 'clear annotations');
  }

  /** A point in the volume. `c` is a palette name, or null for the default. */
  point(x: number, y: number, z: number, c: string | null = null, msg?: string): void {
    this.data.points.push({ x, y, z, c: c ?? null });
    this.record(msg ?? `point (${x}, ${y}, ${z})`);
  }

  clearPoints(msg?: string): void {
    this.data.points = [];
    this.record(msg ?? 'clear points');
  }

  /** A spherical query region. `r` is a radius in world units, not a screen radius. */
  sphere(x: number, y: number, z: number, r: number, c: string | null = null, msg?: string): void {
    this.data.spheres.push({ x, y, z, r, c: c ?? null });
    this.record(msg ?? `sphere (${x}, ${y}, ${z}) r=${r}`);
  }

  clearSpheres(msg?: string): void {
    this.data.spheres = [];
    this.record(msg ?? 'clear spheres');
  }

  /** Read-only: total cubes, root included. Counts octants built but never occupied. */
  size(): number {
    return Object.keys(this.data.nodes).length;
  }

  /**
   * Read-only: the octants of a cube, in the order `subdivide` created them.
   *
   * A public accessor rather than a field a template reads off `data`, for the reason
   * `VizTree.setChildren` documents: the bridge's `_Proxy` defines no `__setitem__`, so a
   * template that reached into `data` could not be ported at all. Reading is the same
   * constraint — the Python side would have no spelling for a bare subscript.
   *
   * The returned array is a copy, so a caller cannot mutate the world without recording.
   */
  childrenOf(id: string): (string | null)[] {
    return this.must(id).kids.slice();
  }

  /** Read-only: the root's side length, which is the depth unit every cube is a multiple of. */
  unit(): number {
    return this.data.extent;
  }
}
