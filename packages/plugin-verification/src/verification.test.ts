import { createPackageFromStreams } from '@electron/asar';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidV4 } from 'uuid';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CogsPluginManifest } from '../../javascript/src';
import { addSignatureToPlugin, verifyPluginSignature } from './verification';

// Test key pair for signing .cogsplugin files
const testKeys = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cryptoMod = require('crypto') as typeof import('crypto');
  const { privateKey, publicKey } = cryptoMod.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
});

describe.each(['environment variable', 'explicit parameter'] as const)('%s', (keySource) => {
  let privateKey: string | undefined = undefined;
  let publicKey: string | undefined = undefined;

  beforeEach(() => {
    privateKey = testKeys.privateKeyPem;
    publicKey = testKeys.publicKeyPem;

    switch (keySource) {
      case 'environment variable':
        process.env.COGS_PRIVATE_KEY = privateKey;
        process.env.COGS_PUBLIC_KEY = publicKey;
        privateKey = undefined;
        publicKey = undefined;
        break;

      case 'explicit parameter':
        privateKey = testKeys.privateKeyPem;
        publicKey = testKeys.publicKeyPem;
        break;
    }
  });

  test('unsigned plugin', async () => {
    const pluginPath = await makePluginAsar('unsigned-plugin');

    expect(await verifyPluginSignature(pluginPath, { publicKey })).toEqual({
      verified: false,
      error: 'No verification signature found',
    });
  });

  test('signed plugin', async () => {
    const pluginPath = await addSignatureToPlugin(await makePluginAsar('signed-plugin'), { privateKey });

    expect(await verifyPluginSignature(pluginPath, { publicKey })).toEqual({
      verified: true,
    });
  });
});

async function makePluginAsar(name: string): Promise<string> {
  const manifest: CogsPluginManifest = {
    name,
    version: '1.0.0',
    description: `${name} description`,
  };
  return await makePluginAsarWithManifest(manifest);
}

async function makePluginAsarWithManifest(manifest: CogsPluginManifest): Promise<string> {
  return await buildSingleFileAsar('cogs-plugin-manifest.json', Buffer.from(JSON.stringify(manifest)));
}

/**
 * Create an ASAR archive containing a single file
 *
 * Returns path to the created .asar file
 **/
async function buildSingleFileAsar(fileName: string, fileContent: Buffer): Promise<string> {
  const packagePath = path.join(os.tmpdir(), uuidV4() + '.asar');
  await createPackageFromStreams(packagePath, [
    {
      type: 'file',
      path: fileName,
      stat: { mode: 0o100644, size: fileContent.length },
      streamGenerator: () => Readable.from([fileContent]),
      unpacked: false,
    },
  ]);
  return packagePath;
}
