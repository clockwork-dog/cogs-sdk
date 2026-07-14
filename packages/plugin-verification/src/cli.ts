#!/usr/bin/env node

import { addSignatureToPlugin, verifyPluginSignature } from './verification.js';

function printUsageAndExit(): never {
  console.error('Usage: plugin-verification <sign|verify> <path-to-cogsplugin>');
  process.exit(1);
}

async function main(): Promise<void> {
  const [command, pluginPath] = process.argv.slice(2);

  if (!pluginPath) {
    printUsageAndExit();
  }

  switch (command) {
    case 'sign':
      await addSignatureToPlugin(pluginPath);
      break;

    case 'verify': {
      const result = await verifyPluginSignature(pluginPath);
      if (!result.verified) {
        console.error(`Verification failed: ${result.error}`);
        process.exit(1);
      }
      console.log('Signature verified');
      break;
    }

    default:
      printUsageAndExit();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
