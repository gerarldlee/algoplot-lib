import type { OctreeData } from '@algoplot/core';
import { ISO_CAM, projectScene } from './layout3d';
import { colorOf } from './palette';

const W = 620;
const H = 460;

/**
 * Cubes for a `VizOctree`, drawn with an axonometric projection.
 *
 * A pure `data` -> SVG function like every other view in this directory: no hooks, no
 * measurement, and the projection lives in `layout3d.ts` so it can be tested on its own.
 * The camera is fixed at the isometric angle, which is the whole reason this can be a
 * `viewBox` rather than a canvas — see the header of `layout3d.ts` for what a movable
 * camera would cost.
 *
 * Three things make an octree legible that a flat drawing of the same boxes does not:
 *
 * - **Occupied cubes are solid, subdivided ones are wireframes.** An octree draws nested
 *   boxes, and twelve edges per cube turns three levels of subdivision into a thicket. A
 *   solid leaf reads as "this region holds a point"; a wireframe parent reads as "this
 *   region was split".
 * - **Faces are shaded by their axis**, so the volume has an up. Without that a cube is
 *   three identically filled parallelograms and reads as a flat hexagon.
 * - **The order comes from the projection, not from here.** SVG paints later elements over
 *   earlier ones, so emitting far-to-near gets occlusion for free.
 */
export function OctreeView({ data }: { data: OctreeData }) {
  const boxes = Object.entries(data.nodes).map(([id, n]) => ({
    id,
    x: n.x,
    y: n.y,
    z: n.z,
    s: n.s,
    // Solid exactly when the struct says the cube is final. Not `kids.length === 0`: the
    // root has no children at step 0 because nothing has run yet, and reading that as
    // "occupied" would draw the whole unsubdivided volume as one point.
    solid: n.lf,
    label: data.annot[id],
  }));

  const prims = projectScene(
    {
      boxes,
      // A dot's radius is in screen units, not world units — scaling it with the scene makes
      // it enormous in a small volume and invisible in a large one.
      points: data.points.map((p, i) => ({ id: `p${i}`, x: p.x, y: p.y, z: p.z, r: 1.5, c: p.c })),
      spheres: data.spheres.map((s, i) => ({ id: `s${i}`, x: s.x, y: s.y, z: s.z, r: s.r, c: s.c })),
    },
    ISO_CAM,
  );

  // `VizOctree` has no transient colour tier — see the note on the struct — so a cube's
  // colour is simply the one a `color` call left on it.
  const cubeColor = (id: string): string | undefined => colorOf(data.colors[id]);

  const px = (v: number) => (v / 100) * W;
  const py = (v: number) => (v / 100) * H;
  // A `<polygon>`'s `points` attribute is a plain coordinate list — "x,y x,y" — **not** a path.
  // Emitting `M x y L x y` here parses as nothing at all: the element stays in the DOM, the
  // view reports the shapes are present, and every face silently renders as a zero-size
  // figure. The symptom is a blank panel with a full element count, which is why the e2e
  // checks element counts and a shoelace area — and why the area check has to read the
  // attribute *without* stripping anything, since stripping the letters is what hides this.
  const points = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`).join(' ');

  return (
    <svg
      className="octree-view"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Octree: ${Object.keys(data.nodes).length} cubes, ${data.points.length} points`}
    >
      {prims.map((p, i) => {
        const key = `${p.kind}-${p.id}-${i}`;
        switch (p.kind) {
          case 'face': {
            const c = cubeColor(p.id);
            return (
              <polygon
                key={key}
                className="oct-face"
                data-face={p.side}
                data-id={p.id}
                points={points(p.pts)}
                // Set only when the cube carries an algorithm colour. With no fill here the
                // stylesheet's own themed mix supplies the neutral one — and `--node-fill`,
                // which would be the obvious fallback, is white on light themes, so an
                // uncoloured cube would vanish into the panel.
                style={c ? { fill: c } : undefined}
              />
            );
          }
          case 'wire': {
            const c = cubeColor(p.id);
            return (
              <polygon
                key={key}
                className="oct-wire"
                data-id={p.id}
                points={points(p.pts)}
                style={{ stroke: c ?? 'var(--node-stroke)' }}
              />
            );
          }
          case 'point':
            return (
              <circle
                key={key}
                className="oct-point"
                data-id={p.id}
                cx={px(p.x)}
                cy={py(p.y)}
                r={px(p.r)}
                style={{ fill: colorOf(p.c) ?? 'var(--accent)' }}
              />
            );
          case 'sphere':
            // A sphere under a parallel projection is a circle of the same radius, so this
            // is exact rather than an approximation — the projection has already scaled `r`
            // onto the screen x-axis.
            return (
              <circle
                key={key}
                className="oct-sphere"
                data-id={p.id}
                cx={px(p.x)}
                cy={py(p.y)}
                r={px(p.r)}
                style={{ stroke: colorOf(p.c) ?? 'var(--accent)' }}
              />
            );
          case 'label':
            return (
              <text
                key={key}
                className="oct-label"
                data-id={p.id}
                x={px(p.x)}
                y={py(p.y)}
                textAnchor="middle"
              >
                {p.text}
              </text>
            );
        }
      })}
    </svg>
  );
}
