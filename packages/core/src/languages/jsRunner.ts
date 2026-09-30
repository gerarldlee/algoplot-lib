import { execJs } from '../run';
import type { LanguageRunner } from './types';

/**
 * The original and fastest path: compile the source with `new Function` and run it in
 * the worker. Everything else in this folder exists to reach the same recorder from a
 * different runtime.
 */
export const jsRunner: LanguageRunner = {
  id: 'js',
  async ensure() {
    /* nothing to load */
  },
  async execute(env, code) {
    execJs(env, code);
  },
};
