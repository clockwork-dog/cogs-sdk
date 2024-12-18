import { CogsClientMessage, CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useHint<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
>(connection: Connection): string | null {
  const [hint, setHint] = useState('');

  useCogsMessage(
    connection,
    useCallback((message: CogsClientMessage) => {
      if (message.type === 'text_hints_update') {
        setHint(message.lastSentHint);
      }
    }, []),
  );

  return hint || null;
}
