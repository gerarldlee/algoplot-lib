import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { RunOutput } from '@algoplot/core';
import { AlgoPlayer, type AlgoPlayerProps } from '@algoplot/react';
// `?inline` bundles the stylesheet as a string, so the drop-in file needs no
// accompanying .css link — and the sheet is scoped to `.ak-player`, which is exactly
// what makes it safe to inject into a shadow root of its own.
import styles from '@algoplot/react/styles.css?inline';

const STYLES = styles;

export interface ElementConfig {
  autoplay?: boolean;
  logs?: boolean;
  memory?: boolean;
  placeholder?: string;
}

/** Structural stand-in for an element, so the mapping is testable in node. */
interface HasAttributes {
  getAttribute(name: string): string | null;
}

/**
 * Parse the `data-payload` attribute. `null` means "no recording yet" (render
 * nothing); malformed JSON throws with the element named, because the only place a
 * reader would otherwise see it is an empty box.
 */
export function parsePayload(raw: string | null): RunOutput | null {
  if (raw === null || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`algoplot-player: data-payload is not valid JSON: ${(e as Error).message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || !Array.isArray((parsed as RunOutput).steps)) {
    throw new Error(
      'algoplot-player: data-payload is not a RunOutput (expected an object with a steps array)',
    );
  }
  return parsed as RunOutput;
}

/**
 * Map attributes to `AlgoPlayer` props. All the booleans are *presence* attributes,
 * HTML-style: `autoplay` is true because it is there, and the defaults live in the
 * component (`logs` off only when `no-logs`, `memory` on only when `no-memory`), so
 * an absent attribute stays absent rather than being pinned to a hard-coded default.
 */
export function configFrom(el: HasAttributes): ElementConfig {
  const out: ElementConfig = {};
  if (el.getAttribute('autoplay') !== null) out.autoplay = true;
  if (el.getAttribute('no-logs') !== null) out.logs = false;
  if (el.getAttribute('no-memory') !== null) out.memory = false;
  const ph = el.getAttribute('placeholder');
  if (ph !== null) out.placeholder = ph;
  return out;
}

// The base class cannot be HTMLElement outright: this module must import cleanly in
// node (tests, SSR, and any tool that parses the package), where there is no DOM at
// all. Nothing instantiates the element there — `register()` and the auto-registration
// below are both gated on customElements existing, which implies HTMLElement does.
const ElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {}) as unknown as typeof HTMLElement;

/**
 * `<algoplot-player>`: renders a precomputed recording (the `data-payload` attribute,
 * exactly as `@algoplot/remark`'s html mode writes it) into a shadow root holding the
 * stylesheet, so a host page needs neither React nor a CSS link.
 */
export class AlgoPlayerElement extends ElementBase {
  static readonly observedAttributes = [
    'data-payload',
    'autoplay',
    'no-logs',
    'no-memory',
    'placeholder',
  ];

  #container: HTMLDivElement | null = null;
  #root: Root | null = null;

  connectedCallback(): void {
    this.#ensure();
    this.#paint();
  }

  disconnectedCallback(): void {
    // The shadow root and its <div> outlive us, so the React root alone is torn down;
    // a later re-connect mounts a fresh one. PlayerStore cleanup is AlgoPlayer's own.
    this.#root?.unmount();
    this.#root = null;
  }

  attributeChangedCallback(): void {
    // Attributes are parsed before the first connection; painting then would race the
    // element's own upgrade. connectedCallback does that first paint.
    if (!this.isConnected) return;
    this.#ensure();
    this.#paint();
  }

  #ensure(): void {
    if (this.#container) return;
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    this.#container = document.createElement('div');
    shadow.append(style, this.#container);
  }

  #paint(): void {
    const container = this.#container;
    if (!container) return;

    let payload: RunOutput | null;
    try {
      payload = parsePayload(this.getAttribute('data-payload'));
    } catch (e) {
      // Loud beats blank: a corrupted attribute shows its reason instead of an
      // empty box nobody can debug.
      this.#dropRoot();
      const pre = document.createElement('pre');
      pre.textContent = (e as Error).message;
      container.replaceChildren(pre);
      return;
    }
    if (!payload) {
      this.#dropRoot();
      container.replaceChildren();
      return;
    }
    if (!this.#root) {
      // React only manages nodes it created; anything we put here earlier (the error
      // <pre>) has to go before the root takes the container over.
      container.replaceChildren();
      this.#root = createRoot(container);
    }
    const props: AlgoPlayerProps = { data: payload, ...configFrom(this) };
    this.#root.render(createElement(AlgoPlayer, props));
  }

  #dropRoot(): void {
    this.#root?.unmount();
    this.#root = null;
  }
}

/** Define the element, idempotently, under `tagName` (default `algoplot-player`). */
export function register(tagName = 'algoplot-player'): void {
  if (typeof customElements === 'undefined') {
    throw new Error('algoplot-player requires a browser with custom elements');
  }
  if (!customElements.get(tagName)) customElements.define(tagName, AlgoPlayerElement);
}

// Importing the package is enough in a browser — the same contract as `@algoplot/python`
// importing registers Python. In node (tests, SSR) there are no custom elements, so the
// import stays side-effect-safe and `register()` remains the explicit door.
if (typeof customElements !== 'undefined') register();
