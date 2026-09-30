import { registerRunner } from '@algoplot/core';
import '@algoplot/core/worker';
import { pyRunner } from './pyRunner';

// Module bodies run in import order: the core worker attaches its message handler
// first, `registerRunner` runs in this file's body, and no message can arrive until
// module evaluation has finished — so the handler always sees a registry that knows
// about Python. The registry module itself is a shared chunk of @algoplot/core's build,
// so both this entry and the worker bundle mutate the same Map.
registerRunner(pyRunner);
