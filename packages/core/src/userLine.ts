const ANON_LINE_RE = /<anonymous>:(\d+):(\d+)/;

/**
 * User code is executed as the body of `new Function('viz','input','console', code)`,
 * so V8 reports every user frame as `<anonymous>:LINE:COL`. The generated wrapper puts
 * the body on line 3 (line 1 is the signature, line 2 is blank), hence the offset.
 */
const WRAPPER_OFFSET = 2;

export function lineFromStack(stack: string | undefined): number | undefined {
  if (!stack) return undefined;
  const m = ANON_LINE_RE.exec(stack);
  if (!m) return undefined;
  const line = parseInt(m[1], 10) - WRAPPER_OFFSET;
  return line >= 1 ? line : undefined;
}

/**
 * The 1-based editor line of the user code that is currently on the stack, or
 * undefined when the caller is not user code (e.g. the final record() after the run).
 *
 * Cost, measured over 200k iterations: ~9.6us at the default Error.stackTraceLimit of
 * 10, ~5.6us at 4-5. runCode tightens the limit for the duration of the run, which
 * makes this roughly 5.6us per recorded step - about 56ms at the 10k step default.
 */
export function captureUserLine(): number | undefined {
  return lineFromStack(new Error().stack);
}
