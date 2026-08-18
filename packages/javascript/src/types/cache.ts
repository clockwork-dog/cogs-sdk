export type ReadyState =
  | typeof HTMLMediaElement.HAVE_NOTHING
  | typeof HTMLMediaElement.HAVE_METADATA
  | typeof HTMLMediaElement.HAVE_CURRENT_DATA
  | typeof HTMLMediaElement.HAVE_FUTURE_DATA
  | typeof HTMLMediaElement.HAVE_ENOUGH_DATA;

export type CacheState = {
  readyState: ReadyState;
  cachedBytes?: number;
};
