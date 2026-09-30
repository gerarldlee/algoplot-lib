export type Path = (string | number)[];

export interface Patch {
  p: Path;
  v: unknown;
}

export interface Step {
  p: Patch[];
  m?: string;
  /** 1-based line of the user code that produced this step, for the editor highlight. */
  l?: number;
}

export type World = {
  order: string[];
  structs: Record<string, StructData>;
  metrics: Record<string, string | number>;
  logs: string[];
};

export type StructData = {
  type: string;
  [key: string]: unknown;
};

export function emptyWorld(): World {
  return { order: [], structs: {}, metrics: {}, logs: [] };
}
