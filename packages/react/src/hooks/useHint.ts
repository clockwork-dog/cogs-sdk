import { Callbacks, CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useMemo, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';
import useCogsCallbacks from './useCogsCallbacks';

export default function useHint(connection: CogsConnectionHandler): string | null {
  const [hint, setHint] = useState('');

  const onMessage = useCallback((message: CogsClientMessage) => {
    switch (message.type) {
      case 'subscription_text_hints_hint_sent':
        setHint(message.hint);
        break;
    }
  }, []);

  const callbacks = useMemo((): Callbacks => ({ onMessage }), [onMessage]);
  useCogsCallbacks(connection, callbacks);

  return hint || null;
}
