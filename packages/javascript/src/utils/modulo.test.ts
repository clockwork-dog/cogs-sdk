import { describe, expect, it } from 'vitest';

import { moduloDiff } from './modulo';

describe('moduloDiff()', () => {
  it('calculates close bounds', () => {
    expect(moduloDiff(51, 49, 100)).toBe(2);
    expect(moduloDiff(0, 17, 100)).toBe(-17);
  });
  it('calculates wrap-around bounds', () => {
    expect(moduloDiff(1, 99, 100)).toBe(2);
    expect(moduloDiff(98, 10, 100)).toBe(-12);
  });
  it('calculates from different loops', () => {
    expect(moduloDiff(2, 101, 100)).toBe(1);
    expect(moduloDiff(10, 205, 100)).toBe(5);
    expect(moduloDiff(5, -190, 100)).toBe(-5);
  });
});
