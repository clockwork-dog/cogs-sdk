export const COGS_SERVER_PORT = 12095;

/**
 * Get the URL of an asset hosted by the COGS server.
 */
export function assetUrl(file: string): string {
  const location = typeof window !== 'undefined' ? window.location : undefined;
  const path = `/assets/${encodeURIComponent(file)}`;

  return `${location?.protocol}//${location?.hostname}:${COGS_SERVER_PORT}${path}`;
}

export async function preloadUrl(url: string): Promise<string> {
  const response = await fetch(url);
  // We used arrayBuffer()` instead of `blob()` because the latter seems to fail on Pis when preloading some files
  return URL.createObjectURL(new Blob([await response.arrayBuffer()]));
}
