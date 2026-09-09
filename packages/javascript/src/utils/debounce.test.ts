import { describe, expect, it, vi } from 'vitest';
import { leadingDebounce } from './debounce';

describe('leadingDebounce()', () => {
  it('calls immediately', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = leadingDebounce(callback, 100);

    debounced('a');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('a');
    vi.useRealTimers();
  });

  it('debounces and calls with most recent args', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = leadingDebounce(callback, 100);

    debounced('a');
    vi.advanceTimersByTime(10);
    debounced('b');
    vi.advanceTimersByTime(10);
    debounced('c');
    vi.advanceTimersByTime(10);

    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('c');
    vi.useRealTimers();
  });

  it('does not call again if there were no calls during the interval', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = leadingDebounce(callback, 100);

    debounced('a');
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('treats a call after the cycle ends as a new leading call', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = leadingDebounce(callback, 100);

    debounced('a');
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);

    debounced('b');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');
    vi.useRealTimers();
  });
});
