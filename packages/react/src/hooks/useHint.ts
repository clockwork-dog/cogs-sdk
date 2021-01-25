import { Callbacks, CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useMemo, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';
import useCogsCallbacks from './useCogsCallbacks';

export default function useHint(connection: CogsConnectionHandler): string | null {
  const [hint, setHint] = useState('');

  const onMessage = useCallback((message: CogsClientMessage) => {
    switch (message.type) {
      case 'text_hints_update':
        setHint(message.lastSentHint);
        break;
    }
  }, []);

  const callbacks = useMemo((): Callbacks => ({ onMessage }), [onMessage]);
  useCogsCallbacks(connection, callbacks);

  return hint || null;
}
