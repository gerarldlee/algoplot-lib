import { registerRunner } from '@algoplot/core';
import { pyRunner } from './pyRunner';

// Importing this package is the whole setup: the runner registers itself, so the
// registry in the *executing* realm — Node during a docs build, or a worker at run
// time — learns about `py` without @algoplot/core ever importing Pyodide.
registerRunner(pyRunner);

export {
  pyRunner,
  setPyodideLoader,
  setPyodideIndexUrl,
  pyodideIndexUrl,
  lineFromPyodideError,
  cleanPyodideMessage,
  PyodideError,
} from './pyRunner';
export type { PyodideApi, PyodideLoader } from './pyRunner';
