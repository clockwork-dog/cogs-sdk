import { useCallback, useEffect, useState } from 'react';

/**
 * Uses the Page Visibility API to detect if the page is currently visible to the user.
 */
export default function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => !document.hidden);
  const onVisibilityChange = useCallback(() => setIsVisible(!document.hidden), []);

  useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChange, false);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  return isVisible;
}
