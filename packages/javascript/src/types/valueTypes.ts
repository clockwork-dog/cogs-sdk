export type PortValue = string | number | boolean;
export type ConfigValue = string | number | boolean;
export type EventValue = string | number | boolean;

export enum ShowPhase {
  Setup = 'setup',
  Preshow = 'pre-show',
  InProgress = 'in progress',
  Finished = 'finished',
}

/*
 * Convert `{ foo: number; bar: null }` to `{ key: 'foo'; value: number } | { key: 'bar', value: undefined }`
 */
export type EventKeyValue<TypeMap extends { [key: string]: EventValue | null }, Key extends keyof TypeMap = keyof TypeMap> = Key extends string
  ? TypeMap[Key] extends null
    ? { key: Key; value: undefined }
    : { key: Key; value: TypeMap[Key] }
  : never;
