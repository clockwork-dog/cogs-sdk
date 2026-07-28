// The Audio Output Devices API (https://webaudio.github.io/web-audio-api/#dom-audiocontext-setsinkid)
// is not yet part of TypeScript's lib.dom.d.ts. Chrome 110+ only; absent entirely on Safari/Firefox,
// so callers must feature-detect with `typeof audioContext.setSinkId === 'function'`.
export {};

declare global {
  interface AudioContext {
    setSinkId?(sinkId: string | { type: 'none' }): Promise<void>;
    readonly sinkId?: string | { type: 'none' };
  }
}
