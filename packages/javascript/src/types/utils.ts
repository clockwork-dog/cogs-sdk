export type DeepReadonly<T> = T extends unknown
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : never;
