export const COGS_ASSETS_SERVER_PORT = 12094;
export const COGS_SERVER_PORT = 12095;

/**
 * @deprecated Use {@link CogsConnection#getAssetUrl} instead. Or pass a boolean to say if you want a
 * HTTP/2 asset URL or not.
 */
export function assetUrl(file: string): string;

/**
 * Returns a URL for the asset. This is different based on if HTTP/2 is requested or not
 */
export function assetUrl(file: string, useHttp2AssetsServer: boolean): string;

export function assetUrl(file: string, useHttp2AssetsServer?: boolean): string {
  const location = typeof window !== 'undefined' ? window.location : undefined;
  const path = `/assets/${encodeURIComponent(file)}`;

  if (useHttp2AssetsServer) {
    return `https://${location?.hostname}:${COGS_ASSETS_SERVER_PORT}${path}`;
  } else {
    return `${location?.protocol}//${location?.hostname}:${COGS_SERVER_PORT}${path}`;
  }
}

export async function preloadUrl(url: string): Promise<string> {
  const response = await fetch(url);
  // We used arrayBuffer()` instead of `blob()` because the latter seems to fail on Pis when preloading some files
  return URL.createObjectURL(new Blob([await response.arrayBuffer()]));
}
