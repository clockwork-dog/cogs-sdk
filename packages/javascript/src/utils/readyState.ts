import { CombinedReadyState, NestedReadyState, READY_STATE, ReadyStateNode } from '../types/ReadyState';

export function getProgress(readyStateNode: ReadyStateNode | CombinedReadyState) {
  switch (readyStateNode.state) {
    case 0:
      return 0;
    case 1:
      return readyStateNode.progress ?? 0;
    case 2:
      return 1;
  }
}

export function combineReadyState(readyState: NestedReadyState): CombinedReadyState {
  return _combineReadyState(readyState, []);
}
function _combineReadyState(readyState: NestedReadyState | CombinedReadyState, pathArray: string[]): CombinedReadyState {
  const path = [...pathArray].filter(Boolean).join('.');

  if ('items' in readyState) {
    let childCount = 0;
    let cumProgress = 0;
    let childMinState: (typeof READY_STATE)[keyof typeof READY_STATE] = READY_STATE.DONE;
    let childMaxState: (typeof READY_STATE)[keyof typeof READY_STATE] = READY_STATE.NONE;
    const errors: string[] = [];

    for (const [key, step] of Object.entries(readyState.items)) {
      childCount++;
      const rs = _combineReadyState(step, [...pathArray, key]);
      childMaxState = Math.max(rs.state, childMaxState) as (typeof READY_STATE)[keyof typeof READY_STATE];
      childMinState = Math.min(rs.state, childMinState) as (typeof READY_STATE)[keyof typeof READY_STATE];
      const p = getProgress(rs);
      errors.push(...rs.errors);
      cumProgress += p;
    }

    const childAvgProgress = childCount === 0 ? 0 : cumProgress / childCount;
    let state: (typeof READY_STATE)[keyof typeof READY_STATE];
    if (childCount === 0) {
      state = READY_STATE.DONE;
    } else if (childMinState === childMaxState) {
      state = childMinState;
    } else {
      state = READY_STATE.IN_PROGRESS;
    }

    return {
      state,
      errors,
      progress: childAvgProgress,
    };
  } else {
    let errors: string[] = [];
    if ('errors' in readyState && readyState.errors?.length) {
      errors = readyState.errors.map((e) => `${path}: ${e}`) as [string, ...string[]];
    }
    return { ...readyState, progress: getProgress(readyState), errors };
  }
}
