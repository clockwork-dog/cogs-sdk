import { describe, expect, it } from 'vitest';
import { READY_STATE } from '../types/ReadyState';
import { combineReadyState } from './readyState';

describe('combineReadyState()', () => {
  it('detects when a task is done', () => {
    expect(combineReadyState({ state: READY_STATE.DONE })).toMatchObject({ state: READY_STATE.DONE });
  });
  it('detects when all tasks are done', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READY_STATE.DONE },
          taskB: { state: READY_STATE.DONE },
          taskC: { state: READY_STATE.DONE },
        },
      }),
    ).toMatchObject({ state: READY_STATE.DONE });
  });
  it('counts no tasks as done', () => {
    expect(combineReadyState({ items: {} })).toMatchObject({ state: READY_STATE.DONE });
  });
  it('is in progress when any tasks are in progress', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READY_STATE.NONE },
          taskB: { state: READY_STATE.IN_PROGRESS },
        },
      }),
    ).toMatchObject({ state: READY_STATE.IN_PROGRESS });
    expect(
      combineReadyState({
        items: {
          taskA: { state: READY_STATE.DONE },
          taskB: { state: READY_STATE.IN_PROGRESS },
        },
      }),
    ).toMatchObject({ state: READY_STATE.IN_PROGRESS });
  });
  it('collects errors', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READY_STATE.DONE, errors: ['timeout'] },
          taskB: { state: READY_STATE.IN_PROGRESS },
          taskC: { state: READY_STATE.DONE, errors: ['failed'] },
        },
      }),
    ).toMatchObject({
      state: READY_STATE.IN_PROGRESS,
      errors: ['taskA: timeout', 'taskC: failed'],
    });
  });
  it('collects deeply nested errors', () => {
    expect(
      combineReadyState({
        items: {
          memoryCache: {
            items: {
              audio: {
                items: {
                  'song.mp3': { state: READY_STATE.DONE, errors: ['Failed to fetch'] },
                },
              },
            },
          },
          diskCache: {
            items: {
              video: {
                items: {
                  'movie.mp4': { state: READY_STATE.DONE, errors: ['Not enough space'] },
                },
              },
            },
          },
        },
      }),
    ).toMatchObject({ errors: ['memoryCache.audio.song.mp3: Failed to fetch', 'diskCache.video.movie.mp4: Not enough space'] });
  });
});
