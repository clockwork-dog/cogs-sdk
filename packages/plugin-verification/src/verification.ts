import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const MAGIC = 'COGSPLUGIN';
const MAGIC_LENGTH = Buffer.byteLength(MAGIC, 'ascii'); // 10
const SIG_LENGTH_BYTES = 4; // uint32 BE
const FOOTER_MIN_SIZE = SIG_LENGTH_BYTES + MAGIC_LENGTH;

export interface VerificationResult {
  verified: boolean;
  error?: string;
}

/**
 * Check the signature of a verified .cogsplugin file.
 *
 * The public key is loaded from the COGS_PUBLIC_KEY environment variable.
 */
export async function checkPluginSignature(cogsPluginPath: string): Promise<VerificationResult> {
  try {
    const buffer = await readCogsPluginBuffer(cogsPluginPath);
    const signature = extractSignatureFromCogsPlugin(buffer);

    if (!signature) {
      return { verified: false, error: 'No verification signature found' };
    }

    const filename = path.basename(cogsPluginPath);
    const asarBytes = stripSignatureFromCogsPlugin(buffer);

    const verifier = crypto.createVerify('SHA256');
    verifier.update(filename);
    verifier.update('\0');
    verifier.update(asarBytes);
    verifier.end();

    const publicKey = process.env.COGS_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('COGS_PUBLIC_KEY environment variable is not set');
    }

    const valid = verifier.verify(publicKey, signature);
    if (!valid) {
      return { verified: false, error: 'Signature verification failed' };
    }

    return { verified: true };
  } catch (e) {
    return { verified: false, error: (e as Error).message };
  }
}

/**
 * Sign a .cogsplugin file so it can be loaded by COGS 5.11 and above.
 *
 * Overwrites the plugin file with the signed version.
 *
 * The private key is loaded from the COGS_PRIVATE_KEY environment variable.
 * Never commit the private key to the repository.
 */
export async function addSignatureToPlugin(cogsPluginPath: string): Promise<string> {
  const privateKey = process.env.COGS_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('COGS_PRIVATE_KEY environment variable is not set');
  }

  const asarBuffer = await fs.promises.readFile(cogsPluginPath);

  const filename = path.basename(cogsPluginPath);
  const signer = crypto.createSign('SHA256');
  signer.update(filename);
  signer.update('\0');
  signer.update(asarBuffer);
  signer.end();
  const signature = signer.sign(privateKey);

  const sigLengthBuf = Buffer.allocUnsafe(SIG_LENGTH_BYTES);
  sigLengthBuf.writeUInt32BE(signature.length, 0);
  const magicBuf = Buffer.from(MAGIC, 'ascii');

  const output = Buffer.concat([asarBuffer, signature, sigLengthBuf, magicBuf]);
  await fs.promises.writeFile(cogsPluginPath, output);

  console.log(`Verified plugin written to ${cogsPluginPath} (signature: ${signature.length} bytes)`);

  return cogsPluginPath;
}

/** Read a .cogsplugin file from disk and return its full buffer. */
export async function readCogsPluginBuffer(archivePath: string): Promise<Buffer> {
  return fs.promises.readFile(archivePath);
}

export function createAsarPathMatcher(path: string): (matchPath: string) => boolean {
  // Slice off the leading slash
  if (path.startsWith('/') || path.startsWith('\\')) {
    path = path.slice(1);
  }

  // Match with no slash, Windows backslash, or Posix forward slash
  // Which slash is used depends on the platform the ASAR was created on
  return (matchPath: string) => path === matchPath || `/${path}` === matchPath || `\\${path}` === matchPath;
}

/**
 * Extract the signature bytes from a .cogsplugin footer.
 * Returns null if no valid footer is present.
 */
export function extractSignatureFromCogsPlugin(buffer: Buffer): Buffer | null {
  if (buffer.length < FOOTER_MIN_SIZE) {
    return null;
  }

  const magic = buffer.subarray(buffer.length - MAGIC_LENGTH).toString('ascii');
  if (magic !== MAGIC) {
    return null;
  }

  const sigLength = buffer.readUInt32BE(buffer.length - MAGIC_LENGTH - SIG_LENGTH_BYTES);
  const asarLength = buffer.length - sigLength - SIG_LENGTH_BYTES - MAGIC_LENGTH;

  if (asarLength <= 0 || sigLength <= 0) {
    return null;
  }

  return buffer.subarray(asarLength, asarLength + sigLength);
}

/**
 * Return just the ASAR bytes from a .cogsplugin file, stripping the signature
 * footer if present. If no footer is found the full buffer is returned.
 */
export function stripSignatureFromCogsPlugin(buffer: Buffer): Buffer {
  if (buffer.length < FOOTER_MIN_SIZE) {
    return buffer;
  }

  const magic = buffer.subarray(buffer.length - MAGIC_LENGTH).toString('ascii');
  if (magic !== MAGIC) {
    return buffer;
  }

  const sigLength = buffer.readUInt32BE(buffer.length - MAGIC_LENGTH - SIG_LENGTH_BYTES);
  const asarLength = buffer.length - sigLength - SIG_LENGTH_BYTES - MAGIC_LENGTH;

  if (asarLength <= 0 || asarLength > buffer.length) {
    return buffer;
  }

  return buffer.subarray(0, asarLength);
}
