export const READYSTATE = {
  NONE: 0,
  IN_PROGRESS: 1,
  DONE: 2,
} as const;

export type NestedReadyState =
  | { items: Record<string, NestedReadyState> }
  | {
      state: typeof READYSTATE.NONE;
    }
  | {
      state: typeof READYSTATE.IN_PROGRESS;
      progress?: number; // [0,1]
    }
  | {
      state: typeof READYSTATE.DONE;
      errors?: [string, ...string[]];
    };

export type CombinedReadyState = {
  state: (typeof READYSTATE)[keyof typeof READYSTATE];
  progress: number;
  errors: string[];
};

export type ReadyStateNode = Extract<NestedReadyState, { state: number }>;
