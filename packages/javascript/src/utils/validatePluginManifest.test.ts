import { describe, expect, test } from 'vitest';
import { CogsPluginManifestJson } from '@clockworkdog/cogs-client';
import { validatePluginManifest } from './validatePluginManifest';

describe('validate plugin manifest', () => {
  test('valid', () => {
    const manifest: CogsPluginManifestJson = {
      name: 'test plugin',
      version: '4.12.0',
      config: [{ name: 'IP address', value: { type: 'string', default: '127.0.0.1' } }],
      state: [
        {
          name: 'Visible',
          value: { type: 'boolean', default: false },
          writableFromCogs: true,
          writableFromClient: true,
        },
      ],
      events: {
        fromCogs: [{ name: 'Start' }],
        toCogs: [{ name: 'Password', value: { type: 'string' } }],
      },
      media: {
        audio: true,
        video: true,
        images: true,
      },
      window: {
        width: 640,
        height: 480,
        visible: true,
      },
      store: {
        items: {
          saveMe: { persistValue: true },
        },
      },
    };
    expect(validatePluginManifest(manifest)).toBeNull();
  });

  describe('invalid', () => {
    test('entirely different', () => {
      expect(
        validatePluginManifest({
          invalid: 'this is incorrect',
          'very bad': 666,
        } as never),
      ).toHaveLength(3); // version missing, name missing, unrecognized keys
    });

    test('invalid version', () => {
      expect(
        validatePluginManifest({
          name: 'test plugin',
          version: 'invalid' as never,
        }),
      ).toHaveLength(1);
    });

    describe('permissions', () => {
      test('invalid permissions', () => {
        expect(
          validatePluginManifest({
            name: 'test plugin',
            version: '0.0.1',
            permissions: {
              root: true,
            } as never,
          }),
        ).toHaveLength(1);
      });

      test('valid network access rule', () => {
        expect(
          validatePluginManifest({
            name: 'test plugin',
            version: '0.0.1',
            permissions: {
              network: {
                access: [{ hosts: ['api.vendor.com:80'] }],
              },
            },
          }),
        ).toBeNull();
      });

      test('invalid network access rule', () => {
        expect(
          validatePluginManifest({
            name: 'test plugin',
            version: '0.0.1',
            permissions: {
              network: {
                access: [
                  { hosts: ['api.vendor.com'] }, // missing port
                ],
              },
            },
          }),
        ).toHaveLength(1);
      });
    });
  });
});
