import { CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useHint(connection: CogsConnection): string | null {
  const [hint, setHint] = useState('');

  useCogsMessage(
    connection,
    useCallback((message) => {
      switch (message.type) {
        case 'text_hints_update':
          setHint(message.lastSentHint);
          break;
      }
    }, [])
  );

  return hint || null;
}
