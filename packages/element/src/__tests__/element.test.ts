import { describe, expect, it } from 'vitest';
import { configFrom, parsePayload } from '../index';

const RUN = { ok: true, steps: [{ t: 0 }], logSteps: [], world: { order: [] }, mem: [] };

describe('parsePayload', () => {
  it('parses a recording', () => {
    expect(parsePayload(JSON.stringify(RUN))).toEqual(RUN);
  });

  it('treats an absent attribute as "no recording yet"', () => {
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload('')).toBeNull();
  });

  it('names the element when the JSON is broken', () => {
    expect(() => parsePayload('{"ok"')).toThrow(/algoplot-player: data-payload is not valid JSON/);
  });

  it('rejects well-formed JSON that is not a recording', () => {
    expect(() => parsePayload('{"ok":true}')).toThrow(/not a RunOutput/);
    expect(() => parsePayload('[1,2,3]')).toThrow(/not a RunOutput/);
  });
});

describe('configFrom', () => {
  const el = (attrs: Record<string, string>) => ({
    getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
  });

  it('maps nothing to nothing, so the component keeps its own defaults', () => {
    expect(configFrom(el({}))).toEqual({});
  });

  it('reads presence as true and negations as false', () => {
    expect(configFrom(el({ autoplay: '' }))).toEqual({ autoplay: true });
    expect(configFrom(el({ 'no-logs': '' }))).toEqual({ logs: false });
    expect(configFrom(el({ 'no-memory': '' }))).toEqual({ memory: false });
  });

  it('passes the placeholder text through', () => {
    expect(configFrom(el({ placeholder: 'loading…' }))).toEqual({ placeholder: 'loading…' });
  });
});

describe('package import', () => {
  it('is side-effect-safe where there are no custom elements (node)', async () => {
    await expect(import('../index')).resolves.toBeDefined();
  });
});
