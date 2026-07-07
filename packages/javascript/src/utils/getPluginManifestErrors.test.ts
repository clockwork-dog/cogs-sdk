import { describe, expect, test } from 'vitest';
import { CogsPluginManifestJson } from '@clockworkdog/cogs-client';
import { getPluginManifestErrors } from './getPluginManifestErrors';

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
    expect(getPluginManifestErrors(manifest)).toBeNull();
  });

  describe('invalid', () => {
    test('entirely different', () => {
      expect(
        getPluginManifestErrors({
          invalid: 'this is incorrect',
          'very bad': 666,
        } as never),
      ).toHaveLength(3); // version missing, name missing, unrecognized keys
    });

    test('invalid version', () => {
      expect(
        getPluginManifestErrors({
          name: 'test plugin',
          version: 'invalid' as never,
        }),
      ).toHaveLength(1);
    });

    describe('permissions', () => {
      test('invalid permissions', () => {
        expect(
          getPluginManifestErrors({
            name: 'test plugin',
            version: '0.0.1',
            permissions: {
              root: true,
            } as never,
          }),
        ).toHaveLength(1);
      });

      test.each(['5.11.0', '5.12.2'] as const)('valid network access rule (%s)', (minCogsVersion) => {
        expect(
          getPluginManifestErrors({
            name: 'test plugin',
            version: '0.0.1',
            minCogsVersion,
            permissions: {
              network: {
                access: [{ hosts: ['api.vendor.com:80'] }],
              },
            },
          }),
        ).toBeNull();
      });

      test.each(['5.9.0', '5.10.0', undefined] as const)('network access rule requires COGS 5.11 (%s)', (minCogsVersion) => {
        expect(
          getPluginManifestErrors({
            name: 'test plugin',
            version: '0.0.1',
            minCogsVersion,
            permissions: {
              network: {
                access: [{ hosts: ['api.vendor.com:80'] }],
              },
            },
          }),
        ).toHaveLength(1);
      });

      test('invalid network access rule', () => {
        expect(
          getPluginManifestErrors({
            name: 'test plugin',
            version: '0.0.1',
            minCogsVersion: '5.11.0',
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
