/**
 * Fence info-string parsing: ```algoplot [js|ts|python] [{ json options }]
 *
 * Strict on purpose. The options sit in a fenced code block a build failure can point
 * at, and an option silently ignored (`"imput": ...`) would present as the algorithm
 * running on the wrong data — the same class of failure as a typo'd template key,
 * which only ever shows up as a 404 or an empty input.
 */

export interface FenceMeta {
  /** Normalised language id understood by the core registry. */
  language: 'js' | 'ts' | 'py';
  input?: unknown;
  seed?: number;
  maxSteps?: number;
  maxMs?: number;
}

const ALIASES: Record<string, FenceMeta['language']> = {
  js: 'js',
  javascript: 'js',
  ts: 'ts',
  typescript: 'ts',
  py: 'py',
  python: 'py',
};

const ALLOWED_KEYS = new Set(['input', 'seed', 'maxSteps', 'maxMs']);
const COUNT_KEYS = ['seed', 'maxSteps', 'maxMs'] as const;

export function parseFence(meta: string | null | undefined): FenceMeta {
  const info = (meta ?? '').trim();
  let language: FenceMeta['language'] = 'js';
  let jsonText = '';

  if (info) {
    if (info.startsWith('{')) {
      // No language word: the whole info string is the options object.
      jsonText = info;
    } else {
      const split = info.search(/\s/);
      const word = split === -1 ? info : info.slice(0, split);
      jsonText = split === -1 ? '' : info.slice(split).trim();
      const normalised = ALIASES[word.toLowerCase()];
      if (!normalised) {
        throw new Error(
          `unknown language '${word}' in \`\`\`algoplot fence (expected js, ts, or python)`,
        );
      }
      language = normalised;
    }
  }

  const raw = parseObject(jsonText);
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(
        `unknown option '${key}' in \`\`\`algoplot fence (allowed: input, seed, maxSteps, maxMs)`,
      );
    }
  }
  for (const key of COUNT_KEYS) {
    const v = raw[key];
    if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
      throw new Error(`fence option '${key}' must be a finite number, got ${JSON.stringify(v)}`);
    }
  }

  return {
    language,
    ...(raw.input !== undefined ? { input: raw.input } : {}),
    ...(raw.seed !== undefined ? { seed: raw.seed as number } : {}),
    ...(raw.maxSteps !== undefined ? { maxSteps: raw.maxSteps as number } : {}),
    ...(raw.maxMs !== undefined ? { maxMs: raw.maxMs as number } : {}),
  };
}

function parseObject(jsonText: string): Record<string, unknown> {
  if (!jsonText) return {};
  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`invalid options JSON in \`\`\`algoplot fence: ${(e as Error).message}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('options in a ```algoplot fence must be a JSON object');
  }
  return value as Record<string, unknown>;
}
