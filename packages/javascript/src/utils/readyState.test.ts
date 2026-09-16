import { describe, expect, it } from 'vitest';
import { READYSTATE } from '../types/ReadyState';
import { combineReadyState } from './readyState';

describe('combineReadyState()', () => {
  it('detects when a task is done', () => {
    expect(combineReadyState({ state: READYSTATE.DONE })).toMatchObject({ state: READYSTATE.DONE });
  });
  it('detects when all tasks are done', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.DONE },
          taskB: { state: READYSTATE.DONE },
          taskC: { state: READYSTATE.DONE },
        },
      }),
    ).toMatchObject({ state: READYSTATE.DONE });
  });
  it('counts no tasks as done', () => {
    expect(combineReadyState({ items: {} })).toMatchObject({ state: READYSTATE.DONE });
  });
  it('is in progress when any tasks are in progress', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.NONE },
          taskB: { state: READYSTATE.IN_PROGRESS },
        },
      }),
    ).toMatchObject({ state: READYSTATE.IN_PROGRESS });
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.DONE },
          taskB: { state: READYSTATE.IN_PROGRESS },
        },
      }),
    ).toMatchObject({ state: READYSTATE.IN_PROGRESS });
  });
  it('collects errors', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.DONE, errors: ['timeout'] },
          taskB: { state: READYSTATE.IN_PROGRESS },
          taskC: { state: READYSTATE.DONE, errors: ['failed'] },
        },
      }),
    ).toMatchObject({
      state: READYSTATE.IN_PROGRESS,
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
                  'song.mp3': { state: READYSTATE.DONE, errors: ['Failed to fetch'] },
                },
              },
            },
          },
          diskCache: {
            items: {
              video: {
                items: {
                  'movie.mp4': { state: READYSTATE.DONE, errors: ['Not enough space'] },
                },
              },
            },
          },
        },
      }),
    ).toMatchObject({ errors: ['memoryCache.audio.song.mp3: Failed to fetch', 'diskCache.video.movie.mp4: Not enough space'] });
  });
  it('reports progress', () => {
    expect(combineReadyState({ state: READYSTATE.NONE }).progress).toBe(0);
    expect(combineReadyState({ state: READYSTATE.IN_PROGRESS }).progress).toBe(0);
    expect(combineReadyState({ state: READYSTATE.DONE }).progress).toBe(1);
  });
  it('sumarises progress', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.DONE },
          taskB: { state: READYSTATE.DONE },
          taskC: { state: READYSTATE.IN_PROGRESS },
          taskD: { state: READYSTATE.NONE },
        },
      }).progress,
    ).toBeCloseTo(0.5);
  });
  it('averages reported progress', () => {
    expect(
      combineReadyState({
        items: {
          taskA: { state: READYSTATE.IN_PROGRESS, progress: 0.6 },
          taskB: { state: READYSTATE.IN_PROGRESS, progress: 0.7 },
          taskC: { state: READYSTATE.IN_PROGRESS, progress: 0.8 },
          taskD: { state: READYSTATE.IN_PROGRESS, progress: 0.9 },
        },
      }).progress,
    ).toBeCloseTo(0.75);
  });
});
