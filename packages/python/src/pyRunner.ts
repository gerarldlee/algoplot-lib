import PY_BRIDGE from './bridge.py?raw';
import type { LanguageRunner, RunEnv } from '@algoplot/core';

const DEFAULT_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/';

/** The slice of the Pyodide API this runner relies on. */
export interface PyodideApi {
  runPythonAsync(
    code: string,
    options?: { globals?: unknown; filename?: string },
  ): Promise<unknown>;
  globals: {
    set(name: string, value: unknown): unknown;
  };
  setStdout?(fn: (...args: unknown[]) => void): void;
  setStderr?(fn: (...args: unknown[]) => void): void;
}

export type PyodideLoader = (indexURL: string) => Promise<PyodideApi>;

/**
 * The runtime is fetched from a CDN by default so the app stays a small static bundle;
 * call `setPyodideIndexUrl` with a vendored copy to keep Python working offline. It is
 * a plain dynamic import of a URL rather than a bundled dependency, so the ~10MB of
 * Pyodide never enters the build graph.
 */
const cdnLoader: PyodideLoader = async (indexURL) => {
  const mod = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
    default?: () => Promise<PyodideApi>;
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi>;
  };
  const load = mod.loadPyodide ?? mod.default;
  if (!load) throw new Error(`no loadPyodide export at ${indexURL}`);
  return load({ indexURL });
};

function isNode(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

/**
 * A docs build runs on Node, where an `https://` module URL cannot be imported at all
 * — so the default there is the npm `pyodide` package instead of the CDN. The
 * specifier is kept behind a variable and marked ignored so neither this package's Vite
 * build nor any consumer bundler tries to pull ~10MB of Pyodide into a browser graph:
 * this path is only reachable when `process.versions.node` says we are on Node.
 */
const nodeLoader: PyodideLoader = async (indexURL) => {
  const spec = 'pyodide';
  let mod: { loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi> };
  try {
    mod = (await import(/* @vite-ignore */ spec)) as typeof mod;
  } catch {
    throw new Error(
      "Python at build time needs the npm 'pyodide' package — install it with `npm install -D pyodide`, " +
        'or call setPyodideLoader/setPyodideIndexUrl to point at a runtime you host yourself.',
    );
  }
  const load = mod.loadPyodide;
  if (!load) throw new Error('the installed `pyodide` package exports no loadPyodide');
  // Node's loader joins indexURL with filenames, so this must be a filesystem path
  // with a trailing separator; a file:// URL is what produced the doubled path in the
  // interpreter bridge's history. An explicit setPyodideIndexUrl wins over the npm
  // package, exactly as it wins over the CDN in the browser.
  const dir = indexURL === DEFAULT_INDEX_URL ? await npmPackageDir() : indexURL;
  return load({ indexURL: dir });
};

/**
 * Locate the installed `pyodide` package. `createRequire().resolve` rather than
 * `import.meta.resolve`: vitest rewrites `import.meta` for its module runner and
 * leaves no `resolve` on it, while require-resolution works identically under plain
 * Node, vite-node, and any bundler's Node target. The `node:module` import is dynamic
 * and external, so a browser graph never evaluates it — this function is only called
 * from `nodeLoader`, which `isNode()` gates.
 */
async function npmPackageDir(): Promise<string> {
  const { createRequire } = (await import(/* @vite-ignore */ 'node:module')) as {
    createRequire(url: string): { resolve(spec: string): string };
  };
  const require_ = createRequire(import.meta.url);
  const pkg = require_.resolve('pyodide/package.json');
  const dir = pkg.slice(0, pkg.lastIndexOf('/') + 1) || pkg.slice(0, pkg.lastIndexOf('\\') + 1);
  return dir;
}

let loader: PyodideLoader | null = null;
/** Set by `setPyodideIndexUrl`; null means the CDN default (browser) or npm (Node). */
let configuredIndexUrl: string | null = null;

/** Test seam: lets the Node suite supply the npm `pyodide` package instead. */
export function setPyodideLoader(fn: PyodideLoader): void {
  loader = fn;
}

/**
 * Point the runtime at a vendored copy of Pyodide. This used to read
 * `import.meta.env.VITE_PYODIDE_INDEX_URL`, which only exists inside a Vite app —
 * a published package has no build-time env of its own.
 */
export function setPyodideIndexUrl(url: string): void {
  configuredIndexUrl = url;
  instance = null;
}

export function pyodideIndexUrl(): string {
  return configuredIndexUrl ?? DEFAULT_INDEX_URL;
}

const USER_FILENAME = 'algoplot.py';
const BRIDGE_FILENAME = 'algoplot_bridge.py';

let instance: Promise<PyodideApi> | null = null;

function load(): Promise<PyodideApi> {
  if (!instance) {
    const pick: PyodideLoader = loader ?? (isNode() ? nodeLoader : cdnLoader);
    instance = pick(pyodideIndexUrl()).catch((e) => {
      instance = null;
      throw e;
    });
  }
  return instance;
}

const USER_FILE_RE = new RegExp(`${USER_FILENAME.replace('.', '\\.')}", line (\\d+)`, 'g');

/** Innermost frame of a Pyodide traceback, i.e. the line the user actually wrote. */
export function lineFromPyodideError(message: string): number | undefined {
  let last: number | undefined;
  for (const m of message.matchAll(USER_FILE_RE)) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1) last = n;
  }
  return last;
}

/** Last line of a CPython traceback, e.g. "ValueError: bad input". */
export function cleanPyodideMessage(raw: string): string {
  const lines = raw.trim().split('\n');
  return lines[lines.length - 1]?.trim() || raw;
}

export class PyodideError extends Error {
  readonly line: number | undefined;
  /** The full traceback, kept for the log panel. */
  readonly traceback: string;

  constructor(raw: string) {
    super(cleanPyodideMessage(raw));
    this.name = 'PyodideError';
    this.traceback = raw;
    this.line = lineFromPyodideError(raw);
  }
}

export const pyRunner: LanguageRunner = {
  id: 'py',

  async ensure() {
    await load();
  },

  async execute(env: RunEnv, code: string) {
    const pyodide = await load();
    // Single-underscore names: Python mangles a __name referenced inside a class body
    // to _ClassName__name, which is how the bridge would silently fail to resolve it.
    pyodide.globals.set('_bridge', {
      setLine: (n: number) => env.rec.setBridgeLine(n),
      enterBatch: () => env.rec.enterBatch(),
      exitBatch: () => env.rec.exitBatch(),
      isArray: (v: unknown) => Array.isArray(v),
    });
    pyodide.globals.set('_js_viz', env.viz);
    pyodide.globals.set('_input_json', JSON.stringify(env.input ?? null));
    pyodide.setStdout?.((s) => env.rec.log(String(s)));
    pyodide.setStderr?.((s) => env.rec.log(`[stderr] ${String(s)}`));
    // The prelude rebinds `viz` and `input` for this run, so runs stay isolated.
    await pyodide.runPythonAsync(PY_BRIDGE, { filename: BRIDGE_FILENAME });
    try {
      await pyodide.runPythonAsync(code, { filename: USER_FILENAME });
    } catch (e) {
      throw new PyodideError(e instanceof Error ? e.message : String(e));
    }
  },

  dispose() {
    instance = null;
  },
};
