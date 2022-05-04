export const COGS_SERVER_PORT = 12095;

export function assetUrl(file: string): string {
  const location = typeof window !== 'undefined' ? window.location : undefined;
  return `${location?.protocol}//${location?.hostname}:${COGS_SERVER_PORT}/assets/${encodeURIComponent(file)}`;
}

export function preloadUrl(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';

    req.onload = function () {
      if (req.status === 200) {
        const blob = this.response;
        const objectURL = URL.createObjectURL(blob);
        resolve(objectURL);
      } else {
        reject(Error(`Failed to preload ${url}. Error code: ${req.status}`));
      }
    };

    req.onerror = (error) => {
      reject(Error(`Failed to preload ${url}:  ${error}`));
    };

    req.send();
  });
}
