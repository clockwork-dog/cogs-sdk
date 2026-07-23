// Shared between processor.ts (worklet global scope) and MediaPreloader.ts (main thread),
// which can't import from each other directly.
export const PHASE_VOCODER_PROCESSOR_NAME = 'phase-vocoder-processor';
