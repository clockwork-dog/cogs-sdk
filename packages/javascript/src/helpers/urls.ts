const COGS_SERVER_PORT = 12095;

export function assetSrc(file: string): string {
  const location = typeof window !== 'undefined' ? window.location : undefined;
  return `${location?.protocol}//${location?.hostname}:${COGS_SERVER_PORT}/assets/${file}`;
}
