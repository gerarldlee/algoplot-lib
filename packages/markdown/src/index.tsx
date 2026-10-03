import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { executeRun, type RunOutput } from '@algoplot/core';
import { AlgoPlayer, type AlgoPlayerProps } from '@algoplot/react';
import { parseFence } from '@algoplot/remark';

const ALGOPLOT_LANGUAGE_PATTERN = /(?:^|\s)language-algoplot(?:\s|$)/;
const MOUNT_FLAG = 'data-algoplot-mounted';

export interface MountAllOptions {
  /** Custom component render, useful for providers or wrappers around <AlgoPlayer/>. */
  render?: (output: RunOutput) => React.ReactNode;
  /** Called when a fence fails to execute. */
  onError?: (error: Error, codeBlock: Element) => void;
}

export interface MountResult {
  /** Number of fences mounted by this call. */
  mounted: number;
  /** Removes all players that this call mounted. */
  dispose: () => void;
}

function isAlgoplotCodeBlock(element: Element): boolean {
  return (
    element.tagName === 'CODE' &&
    ALGOPLOT_LANGUAGE_PATTERN.test(element.className) &&
    element.parentElement !== null &&
    element.parentElement.tagName === 'PRE'
  );
}

function renderDefault(output: RunOutput) {
  return createElement(AlgoPlayer, { data: output } as AlgoPlayerProps);
}

/**
 * Scan `root` for ```algoplot code fences (`pre > code.language-algoplot`)
 * and mount a live player in place of each one.
 *
 * Works with any markdown-to-HTML pipeline (marked, remark, CMS output).
 * Safe to call multiple times: already-mounted fences are skipped.
 */
export async function mountAll(
  root: Element = document.body,
  options: MountAllOptions = {},
): Promise<MountResult> {
  const render = options.render ?? renderDefault;
  const codeBlocks = Array.from(root.querySelectorAll('code')).filter(isAlgoplotCodeBlock);
  const mountedRoots: Root[] = [];
  const placeholders: HTMLElement[] = [];

  for (const codeBlock of codeBlocks) {
    if (codeBlock.hasAttribute(MOUNT_FLAG)) {
      continue;
    }

    const raw = codeBlock.textContent ?? '';
    const infoMatch = raw.match(/^\s*algoplot\b\s*([^\n]*)\n?([\s\S]*)$/i);
    let body = raw;
    let infoString: string | undefined;

    if (infoMatch) {
      infoString = infoMatch[1].trim() || undefined;
      body = infoMatch[2];
    }

    const container = root.ownerDocument.createElement('div');
    container.className = 'algoplot-mount';
    codeBlock.setAttribute(MOUNT_FLAG, 'true');

    try {
      const meta = parseFence(infoString);
      const output = await executeRun(body, {
        language: meta.language,
        input: meta.input,
        seed: meta.seed,
        maxSteps: meta.maxSteps,
        maxMs: meta.maxMs,
      });

      if (!output.ok) {
        throw new Error(output.error?.message ?? 'unknown error');
      }

      const reactRoot = createRoot(container);
      reactRoot.render(render(output));
      mountedRoots.push(reactRoot);
      placeholders.push(container);
    } catch (e) {
      options.onError?.(e as Error, codeBlock);
      continue;
    }

    const pre = codeBlock.parentElement as HTMLElement;
    pre.replaceWith(container);
  }

  return {
    mounted: placeholders.length,
    dispose: () => {
      for (const reactRoot of mountedRoots) {
        reactRoot.unmount();
      }
      for (let index = placeholders.length - 1; index >= 0; index -= 1) {
        placeholders[index].remove();
      }
    },
  };
}
