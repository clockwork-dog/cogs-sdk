const COGS_SERVER_PORT = 12095;

export function assetSrc(file: string): string {
  return `${location.protocol}//${location.hostname}:${COGS_SERVER_PORT}/assets/${file}`;
}
