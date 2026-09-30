import { jsRunner } from './jsRunner';
import { tsRunner } from './tsRunner';
import { DEFAULT_LANGUAGE, isLanguageId, type LanguageId, type LanguageRunner } from './types';

/**
 * Runners register themselves rather than being imported here. The base package ships
 * JavaScript and TypeScript; `@algoplot/python` calls `registerRunner` on import, so a
 * consumer that never writes a Python fence never loads Pyodide, and the worker has a
 * separate entry point that performs the same registration before messages arrive.
 */
const RUNNERS = new Map<LanguageId, LanguageRunner>([
  ['js', jsRunner],
  ['ts', tsRunner],
]);

export function registerRunner(runner: LanguageRunner): void {
  RUNNERS.set(runner.id, runner);
}

export function hasRunner(id: LanguageId): boolean {
  return RUNNERS.has(id);
}

/** Runners are singletons so a loaded runtime (Pyodide) is reused across runs. */
export function getRunner(id: LanguageId): LanguageRunner {
  return RUNNERS.get(id) ?? RUNNERS.get(DEFAULT_LANGUAGE)!;
}

export function runnerFor(id: string | undefined): LanguageRunner {
  if (id !== undefined && isLanguageId(id)) {
    const runner = RUNNERS.get(id);
    if (runner) return runner;
    // A language that exists but whose package is not installed must fail loudly:
    // falling back to JavaScript would compile a Python file as JS and report a syntax
    // error on line 1 of a program that was never meant to run here.
    if (id === 'py') {
      throw new Error(
        'Python support is not installed. Add @algoplot/python (and register its runner) to run Python sources.',
      );
    }
  }
  return RUNNERS.get(DEFAULT_LANGUAGE)!;
}

export { LANGUAGES, LANGUAGE_LIST, DEFAULT_LANGUAGE, isLanguageId } from './types';
export type { LanguageDef, LanguageId, LanguageRunner } from './types';
