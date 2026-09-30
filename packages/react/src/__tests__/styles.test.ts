import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'styles.css');

/**
 * Every selector in the shipped stylesheet must sit under `.ak-player`. The extractor
 * enforced this at generation time, but the file is hand-maintained from here on, and
 * an unprefixed rule is the one regression that is invisible everywhere else: it would
 * quietly restyle whatever it matches in the host page. Walks the (comment-stripped)
 * sheet at rule depth and checks every prelude; inside `@keyframes`/`@font-face` the
 * preludes are frame selectors and are exempt.
 */
function selectorPreludes(css: string): { prelude: string; ok: boolean }[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { prelude: string; ok: boolean }[] = [];
  let depth = 0;
  let exempt = false;
  let start = 0;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') {
      const prelude = stripped.slice(start, i).trim().replace(/\s+/g, ' ');
      start = i + 1;
      const isAtRule = prelude.startsWith('@');
      if (isAtRule) {
        exempt = /@(keyframes|font-face|-webkit-keyframes)/.test(prelude);
        out.push({ prelude, ok: true }); // at-rules themselves are fine anywhere
      } else {
        out.push({
          prelude,
          ok: exempt || prelude.split(',').every((p) => p.trim().startsWith('.ak-player')),
        });
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) exempt = false;
      start = i + 1;
    }
  }
  return out;
}

describe('styles.css scoping', () => {
  const css = readFileSync(cssPath, 'utf8');

  it('gates every selector under .ak-player', () => {
    const bad = selectorPreludes(css).filter((r) => !r.ok);
    expect(bad.map((r) => r.prelude)).toEqual([]);
  });

  it('declares the palette on the root, so hosts can override it in place', () => {
    expect(css).toMatch(/\.ak-player \{[^}]*--panel:/);
    expect(css).toMatch(/\.ak-player \{[^}]*--cellw:/);
  });

  it('leaves the chrome/log heights on the host-settable split variables', () => {
    expect(css).toContain('var(--s3, 300px)');
    expect(css).toContain('var(--s4, 96px)');
  });
});
