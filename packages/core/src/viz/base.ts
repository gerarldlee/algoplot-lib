import type { Recorder } from '../recorder';

export type StructDataMap = Record<string, unknown> & { type: string };

export class Struct {
  constructor(
    protected rec: Recorder,
    public readonly id: string,
    public readonly data: StructDataMap,
  ) {
    rec.register(id, data);
  }

  protected record(msg?: string): void {
    this.rec.record(msg);
  }
}
