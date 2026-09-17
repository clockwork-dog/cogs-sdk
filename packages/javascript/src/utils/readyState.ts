import { CombinedReadyState, NestedReadyState, READY_STATE, ReadyStateNode } from '../types/ReadyState';

export function getProgress(readyStateNode: ReadyStateNode | CombinedReadyState) {
  switch (readyStateNode.state) {
    case READY_STATE.NONE:
    case READY_STATE.IN_PROGRESS:
      return 0;
    case READY_STATE.DONE:
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
    let childMinState: (typeof READY_STATE)[keyof typeof READY_STATE] = READY_STATE.DONE;
    let childMaxState: (typeof READY_STATE)[keyof typeof READY_STATE] = READY_STATE.NONE;
    const errors: string[] = [];

    for (const [key, step] of Object.entries(readyState.items)) {
      childCount++;
      const rs = _combineReadyState(step, [...pathArray, key]);
      childMaxState = Math.max(rs.state, childMaxState) as (typeof READY_STATE)[keyof typeof READY_STATE];
      childMinState = Math.min(rs.state, childMinState) as (typeof READY_STATE)[keyof typeof READY_STATE];
      errors.push(...rs.errors);
    }

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
    };
  } else {
    let errors: string[] = [];
    if ('errors' in readyState && readyState.errors?.length) {
      errors = readyState.errors.map((e) => `${path}: ${e}`) as [string, ...string[]];
    }
    return { ...readyState, errors };
  }
}
