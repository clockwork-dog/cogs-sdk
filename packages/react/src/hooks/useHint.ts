import { CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useHint(connection: CogsConnection): string | null {
  const [hint, setHint] = useState('');

  useCogsMessage(
    connection,
    useCallback((message) => {
      message.type === 'text_hints_update' && setHint(message.lastSentHint);
    }, [])
  );

  return hint || null;
}
