import { createPackageFromStreams } from '@electron/asar';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidV4 } from 'uuid';
import { beforeAll, expect, test } from 'vitest';
import { CogsPluginManifest } from '../../javascript/src';
import { addSignatureToPlugin, checkPluginSignature } from './verification';

// Test key pair for signing/verifying .cogsplugin files
beforeAll(() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  process.env.COGS_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  process.env.COGS_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
});

test('unsigned plugin', async () => {
  const pluginPath = await makePluginAsar('unsigned-plugin');

  expect(await checkPluginSignature(pluginPath)).toEqual({
    verified: false,
    error: 'No verification signature found',
  });
});

test('signed plugin', async () => {
  const pluginPath = await addSignatureToPlugin(await makePluginAsar('signed-plugin'));

  expect(await checkPluginSignature(pluginPath)).toEqual({
    verified: true,
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
