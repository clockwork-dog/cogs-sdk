import { describe, expect, it } from 'vitest';
import { getPropertiesAtTime, getTemporalPropertiesAtTime } from './getStateAtTime';

describe('getPropertiesAtTime()', () => {
  it('gives back initial values', () => {
    expect(getPropertiesAtTime([[0, { set: { key: 'value' } }]], 0)).toEqual({ key: 'value' });
    expect(getPropertiesAtTime([[0, { set: { number: 1 } }]], 0)).toEqual({ number: 1 });
  });
  it('lerps between values', () => {
    const lerpFrom0To100: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { set: { value: 0 } }],
      [100, { lerp: { value: 100 } }],
    ];
    expect(getPropertiesAtTime(lerpFrom0To100, 0)).toEqual({ value: 0 });
    expect(getPropertiesAtTime(lerpFrom0To100, 50)).toEqual({ value: 50 });
    expect(getPropertiesAtTime(lerpFrom0To100, 75)).toEqual({ value: 75 });
  });
  it('ignores values set in the future', () => {
    const setValueAt100: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { set: { value: 0 } }],
      [100, { set: { value: 100 } }],
    ];
    expect(getPropertiesAtTime(setValueAt100, 0)).toEqual({ value: 0 });
    expect(getPropertiesAtTime(setValueAt100, 50)).toEqual({ value: 0 });
    expect(getPropertiesAtTime(setValueAt100, 75)).toEqual({ value: 0 });
  });
  it('handles multiple lerps', () => {
    const upTo100AndDownFrom200: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { set: { up: 0, down: 200 } }],
      [100, { lerp: { up: 100, down: 50 } }],
    ];
    expect(getPropertiesAtTime(upTo100AndDownFrom200, 0)).toEqual({ up: 0, down: 200 });
    expect(getPropertiesAtTime(upTo100AndDownFrom200, 50)).toEqual({ up: 50, down: 125 });
    expect(getPropertiesAtTime(upTo100AndDownFrom200, 75)).toEqual({ up: 75, down: 87.5 });
  });
  it('allows duplicate lerp keyframes', () => {
    const duplicateLerp: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { lerp: { value: 0 } }],
      [100, { lerp: { value: 100 } }],
      [100, { lerp: { value: 200 } }],
      [200, { lerp: { value: 300 } }],
    ];
    expect(getPropertiesAtTime(duplicateLerp, 50)).toEqual({ value: 50 });
    expect(getPropertiesAtTime(duplicateLerp, 99)).toEqual({ value: 99 });
    expect(getPropertiesAtTime(duplicateLerp, 100)).toEqual({ value: 200 });
    expect(getPropertiesAtTime(duplicateLerp, 150)).toEqual({ value: 250 });
  });
  it('allows duplicate set keyframes', () => {
    const duplicateLerp: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { set: { value: 0 } }],
      [0, { set: { value: 100 } }],
      [0, { set: { value: 200 } }],
      [0, { set: { value: 300 } }],
    ];
    expect(getPropertiesAtTime(duplicateLerp, 0)).toEqual({ value: 300 });
    expect(getPropertiesAtTime(duplicateLerp, 100)).toEqual({ value: 300 });
  });
  it('ignores unknown values in the future', () => {
    const unknownValueAt100: [number, { set?: Record<any, unknown>; lerp?: Record<any, unknown> }][] = [
      [0, { set: { value: 0 } }],
      [100, { set: { unknown: '?' } }],
    ];
    expect(getPropertiesAtTime(unknownValueAt100, 0)).toEqual({ value: 0 });
    expect(getPropertiesAtTime(unknownValueAt100, 50)).toEqual({ value: 0 });
    expect(getPropertiesAtTime(unknownValueAt100, 100)).toEqual({ value: 0, unknown: '?' });
    expect(getPropertiesAtTime(unknownValueAt100, 150)).toEqual({ value: 0, unknown: '?' });
  });
});

describe('getTemporalPropertiesAtTime()', () => {
  it('takes initial values', () => {
    const pausedAt100: [number, { set?: Record<any, unknown> }][] = [[0, { set: { t: 100, rate: 0 } }]];
    expect(getTemporalPropertiesAtTime(pausedAt100, 0)).toEqual({ t: 100, rate: 0 });
  });
  it('keeps track of time past the end of the media', () => {
    const playFromZero: [number, { set?: Record<any, unknown> }][] = [[0, { set: { t: 0, rate: 1 } }]];
    expect(getTemporalPropertiesAtTime(playFromZero, 0)).toEqual({ t: 0, rate: 1 });
    expect(getTemporalPropertiesAtTime(playFromZero, 100)).toEqual({ t: 100, rate: 1 });
    expect(getTemporalPropertiesAtTime(playFromZero, 250)).toEqual({ t: 250, rate: 1 });
  });
  it('can loop', () => {
    const loopEvery100: [number, { set?: Record<any, unknown> }][] = [
      [0, { set: { t: 0, rate: 1 } }],
      [100, { set: { t: 0, rate: 1 } }],
      [200, { set: { t: 0, rate: 1 } }],
      [300, { set: { t: 0, rate: 1 } }],
      [400, { set: { t: 0, rate: 1 } }],
    ];
    expect(getTemporalPropertiesAtTime(loopEvery100, 0)).toEqual({ t: 0, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 99)).toEqual({ t: 99, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 100)).toEqual({ t: 0, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 101)).toEqual({ t: 1, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 150)).toEqual({ t: 50, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 199)).toEqual({ t: 99, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 200)).toEqual({ t: 0, rate: 1 });
    expect(getTemporalPropertiesAtTime(loopEvery100, 201)).toEqual({ t: 1, rate: 1 });
  });
  it('keeps track of time past the end of the media at different rates', () => {
    const quickPlayFromZero: [number, { set?: Record<any, unknown> }][] = [[0, { set: { t: 0, rate: 2 } }]];
    expect(getTemporalPropertiesAtTime(quickPlayFromZero, 0)).toEqual({ t: 0, rate: 2 });
    expect(getTemporalPropertiesAtTime(quickPlayFromZero, 100)).toEqual({ t: 200, rate: 2 });
    expect(getTemporalPropertiesAtTime(quickPlayFromZero, 250)).toEqual({ t: 500, rate: 2 });
  });
  it('looks backward from the first keyframe', () => {
    const playLater: [number, { set?: Record<any, unknown> }][] = [[100, { set: { t: 0, rate: 1 } }]];
    expect(getTemporalPropertiesAtTime(playLater, 0)).toBeUndefined();
  });
  it('keeps track of time when not explicitly set', () => {
    const playPausePlayPausePlay: [number, { set?: Record<any, unknown> }][] = [
      [0, { set: { t: 0, rate: 1 } }],
      [100, { set: { rate: 0 } }],
      [200, { set: { rate: 1 } }],
      [300, { set: { rate: 0 } }],
      [400, { set: { rate: 1 } }],
    ];
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 0)).toEqual({ t: 0, rate: 1 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 50)).toEqual({ t: 50, rate: 1 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 100)).toEqual({ t: 100, rate: 0 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 150)).toEqual({ t: 100, rate: 0 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 200)).toEqual({ t: 100, rate: 1 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 250)).toEqual({ t: 150, rate: 1 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 300)).toEqual({ t: 200, rate: 0 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 350)).toEqual({ t: 200, rate: 0 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 400)).toEqual({ t: 200, rate: 1 });
    expect(getTemporalPropertiesAtTime(playPausePlayPausePlay, 450)).toEqual({ t: 250, rate: 1 });
  });
});
