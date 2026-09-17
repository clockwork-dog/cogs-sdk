export const READY_STATE = {
  NONE: 0,
  IN_PROGRESS: 1,
  DONE: 2,
} as const;

export type NestedReadyState =
  | { items: Record<string, NestedReadyState> }
  | {
      state: typeof READY_STATE.NONE;
    }
  | {
      state: typeof READY_STATE.IN_PROGRESS;
      progress?: number; // [0,1]
    }
  | {
      state: typeof READY_STATE.DONE;
      errors?: [string, ...string[]];
    };

export type CombinedReadyState = {
  state: (typeof READY_STATE)[keyof typeof READY_STATE];
  progress: number;
  errors: string[];
};

export type ReadyStateNode = Extract<NestedReadyState, { state: number }>;
