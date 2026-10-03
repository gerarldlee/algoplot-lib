/**
 * Pack every package into a temp project, install the tarballs, and exercise the
 * *published* surface — dist files, exports maps, dts — which the unit suite never
 * touches (it runs against src through aliases).
 *
 *   node tools/smoke.mjs
 *
 * Covers: core (js/ts executeRun), remark (both modes against the built plugin),
 * react (renderToString), element (node-safe import + helpers), python (a real
 * Pyodide run), and the presence of the worker files in core's tarball.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const work = mkdtempSync(join(tmpdir(), 'algoplot-smoke-'));
let failed = false;

function ok(label, detail = '') {
  console.log(`  ok  ${label}${detail ? ` — ${detail}` : ''}`);
}
function bad(label, detail) {
  failed = true;
  console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}
function sh(cmd, args, opts = {}) {
  // npm is a .cmd on Windows, which execFileSync cannot start without a shell.
  const shell = cmd === 'npm';
  return execFileSync(cmd, args, { cwd: work, encoding: 'utf8', shell, ...opts });
}

try {
  const packages = ['core', 'python', 'react', 'remark', 'web', 'markdown'];
  const tarballs = {};
  const listings = {};
  for (const p of packages) {
    const out = JSON.parse(
      sh('npm', ['pack', '--json', '-w', `@algoplot/${p}`, '--pack-destination', work], {
        cwd: root,
      }),
    );
    listings[p] = out[0].files.map((f) => f.path);
    tarballs[p] = join(work, out[0].filename);
    ok(`pack @algoplot/${p}`, `${listings[p].length} files, ${out[0].size} B`);
  }

  const expect = {
    core: ['dist/index.js', 'dist/index.d.ts', 'dist/worker/runner.worker.js'],
    python: ['dist/index.js', 'dist/workerEntry.js'],
    react: ['dist/index.js', 'styles.css'],
    remark: ['dist/index.js', 'dist/fence.d.ts'],
    web: ['dist/index.js'],
    markdown: ['dist/index.js'],
  };
  for (const [p, files] of Object.entries(expect)) {
    for (const f of files) {
      if (listings[p].includes(f)) ok(`${p}: contains ${f}`);
      else bad(`${p}: missing ${f}`);
    }
  }
  if (listings.core.some((f) => f.startsWith('dist/assets/runner.worker'))) {
    ok('core: contains the bundled worker asset');
  } else {
    bad('core: no dist/assets/runner.worker-*.js in tarball');
  }

  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({ name: 'smoke', private: true, type: 'module' }, null, 2),
  );
  sh('npm', [
    'install',
    '--no-audit',
    '--no-fund',
    ...Object.values(tarballs),
    'react@18',
    'react-dom@18',
    'pyodide',
  ]);
  ok('install tarballs into a clean project');

  const script = `
    import assert from 'node:assert/strict';
    let passed = 0;
    const ok = (label) => { passed++; console.log('  ok  ' + label); };

    // --- core: the public executeRun, js + ts (dist, not src)
    const { executeRun } = await import('@algoplot/core');
    const js = await executeRun("const a = viz.array([3,1,2]); a.swap(0,2); viz.step('x');", { input: {} });
    assert.equal(js.ok, true, 'js run: ' + (js.error?.message ?? ''));
    assert.ok(js.steps.length > 0, 'js has steps');
    ok('core: executeRun js');

    const ts = await executeRun('const n: number = 4; viz.array([n]);', { language: 'ts' });
    assert.equal(ts.ok, true, 'ts run: ' + (ts.error?.message ?? ''));
    ok('core: executeRun ts (sucrase via require)');

    // --- remark: built plugin, both modes, against a hand-built mdast
    const remarkAlgoplot = (await import('@algoplot/remark')).default;
    const fence = () => ({ type: 'root', children: [{ type: 'code', lang: 'algoplot', meta: 'js {"input":{"n":7}}', value: 'viz.array([input.n]);' }] });
    const file = { fail(msg) { throw new Error(msg); } };
    const jsxTree = fence();
    await remarkAlgoplot()(jsxTree, file);
    assert.equal(jsxTree.children[0].type, 'mdxJsxFlowElement');
    const attr = jsxTree.children[0].attributes.find((a) => a.name === 'data');
    assert.equal(JSON.parse(attr.value.value).ok, true);
    ok('remark: jsx mode emits a playable payload');

    const htmlTree = fence();
    await remarkAlgoplot({ mode: 'html' })(htmlTree, file);
    assert.match(htmlTree.children[0].value, /^<algoplot-player data-payload="/);
    const json = /data-payload="([\\s\\S]*)"><\\/algoplot-player>/.exec(htmlTree.children[0].value)[1]
      .replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    assert.equal(JSON.parse(json).ok, true);
    ok('remark: html mode payload round-trips through attribute escaping');

    let threw = false;
    try {
      await remarkAlgoplot()(Object.assign(fence(), { children: [{ type: 'code', lang: 'algoplot', meta: 'js {"imput":1}', value: 'x' }] }), file);
    } catch (e) { threw = /unknown option 'imput'/.test(e.message); }
    assert.ok(threw, 'strict options must fail');
    ok('remark: strict fence options still fail the build');

    // --- react: SSR of the built component
    const { createElement } = await import('react');
    const { renderToString } = await import('react-dom/server');
    const { AlgoPlayer } = await import('@algoplot/react');
    const html = renderToString(createElement(AlgoPlayer, { data: js }));
    assert.match(html, /ak-player/);
    assert.match(html, /view-area/);
    ok('react: renderToString(AlgoPlayer) emits the player');

    // --- web: node-safe import and the pure helpers
    const el = await import('@algoplot/web');
    assert.equal(typeof el.register, 'function');
    assert.equal(el.parsePayload(JSON.stringify(js)).ok, true);
    assert.deepEqual(el.configFrom({ getAttribute: (n) => (n === 'autoplay' ? '' : null) }), { autoplay: true });
    ok('web: imports safely in node; parsePayload/configFrom work');

    // --- markdown: node-safe import
    const md = await import('@algoplot/markdown');
    assert.equal(typeof md.mountAll, 'function');
    ok('markdown: imports safely in node');

    // --- python: registers on import, runs through npm pyodide
    await import('@algoplot/python');
    const py = await executeRun('viz.array([1, 2])\\nviz.step("py")', { language: 'py' });
    assert.equal(py.ok, true, 'py run: ' + (py.error?.message ?? ''));
    assert.ok(py.steps.length >= 1);
    ok('python: executeRun py through npm pyodide');

    console.log(passed + ' checks passed');
  `;
  const scriptPath = join(work, 'checks.mjs');
  writeFileSync(scriptPath, script);
  const inner = sh(process.execPath, [scriptPath]);
  console.log(inner.trimEnd());
  ok('all published-surface checks');
} catch (e) {
  failed = true;
  console.error('FAIL ', e.message?.split('\n').slice(0, 8).join('\n') ?? String(e));
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(failed ? 'SMOKE FAILED' : 'SMOKE PASSED');
process.exit(failed ? 1 : 0);
