import { preloadUrl } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function usePreloadedUrl(url: string): string | undefined {
  const [preloadedUrl, setPreloadedUrl] = useState<string>();
  useEffect(() => {
    preloadUrl(url).then((url) => setPreloadedUrl(url));
  }, [url]);
  return preloadedUrl;
}
