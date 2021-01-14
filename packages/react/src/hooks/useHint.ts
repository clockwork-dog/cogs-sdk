import { CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useEffect, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

export default function useHint(connection: CogsConnectionHandler): string | null {
  const [hint, setHint] = useState('');

  const onMessage = useCallback((message: CogsClientMessage) => {
    switch (message.type) {
      case 'subscription_text_hints_hint_sent':
        setHint(message.hint);
        break;
    }
  }, []);

  useEffect(() => {
    const handler = { onMessage };
    connection.addHandler(handler);
    return () => {
      connection.removeHandler(handler);
    };
  }, [connection, onMessage]);

  return hint || null;
}
