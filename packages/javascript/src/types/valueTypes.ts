export enum ShowPhase {
  Setup = 'setup',
  Preshow = 'pre-show',
  InProgress = 'in progress',
  Finished = 'finished',
}

/*
 * Convert `{ foo: number; bar: null }` to `{ key: 'foo'; value: number } | { key: 'bar', value: undefined }`
 */
export type EventKeyValue<TypeMap extends { [key: string]: unknown }, Key extends keyof TypeMap = keyof TypeMap> = Key extends string
  ? TypeMap[Key] extends undefined
    ? { key: Key; value: undefined }
    : { key: Key; value: TypeMap[Key] }
  : never;
