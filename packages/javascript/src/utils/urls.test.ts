// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';
import { assetUrl } from './urls';

describe('assetUrl()', () => {
  test('encodes spaces', () => {
    expect(assetUrl('My Image.png')).toBe('http://localhost:12095/assets/My%20Image.png');
  });
});
