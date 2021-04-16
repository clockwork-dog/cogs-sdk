import { BackgroundOptions, CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useBackground(connection: CogsConnection): BackgroundOptions | null {
  const [background, setBackground] = useState<BackgroundOptions | null>(null);

  useCogsMessage(
    connection,
    useCallback((message) => {
      switch (message.type) {
        case 'media_config_update':
          setBackground(message.background ?? null);
          break;
      }
    }, [])
  );

  return background;
}
