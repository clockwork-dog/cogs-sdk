export const PORT = 4567;

export function createTestURL(file: string, options: { delayMs?: number; fail?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (options.delayMs) params.set('delayMs', String(options.delayMs));
  if (options.fail) params.set('fail', 'true');
  const query = params.toString();
  return `http://localhost:${PORT}/${file}${query ? `?${query}` : ''}`;
}
