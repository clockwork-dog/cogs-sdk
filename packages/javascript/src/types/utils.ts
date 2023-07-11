export type DeepReadonly<T> = T extends unknown
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : never;

export type DeepMutable<T> = T extends unknown
  ? {
      -readonly [P in keyof T]: DeepMutable<T[P]>;
    }
  : never;

export type DistributeObject<T> = T extends Record<string | number | symbol, unknown> ? { [K in keyof T]: T[K] } : T;
