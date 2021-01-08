import { Callbacks, createCogsConnnection } from '@clockworkdog/cogs-client';
import { CogsConnection } from '@clockworkdog/cogs-client/dist/createCogsConnnection';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

export default function useCogsConnection(
  options: Parameters<typeof createCogsConnnection>[1]
): CogsConnection & CogsConnectionHandler & { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlers = useRef(new Set<Callbacks>());

  const addHandler = useCallback((handler: Callbacks) => handlers.current.add(handler), [handlers]);
  const removeHandler = useCallback((handler: Callbacks) => handlers.current.delete(handler), [handlers]);

  const forwardHandlers = useMemo(
    (): Callbacks => ({
      onSocketOpen: () => handlers.current.forEach((handler) => handler.onSocketOpen?.()),
      onSocketClose: () => handlers.current.forEach((handler) => handler.onSocketClose?.()),
      onMessage: (message) => handlers.current.forEach((handler) => handler.onMessage?.(message)),
      onConfig: (config) => handlers.current.forEach((handler) => handler.onConfig?.(config)),
      onEvent: (key, value) => handlers.current.forEach((handler) => handler.onEvent?.(key, value)),
      onUpdates: (updates) => handlers.current.forEach((handler) => handler.onUpdates?.(updates)),
    }),
    [handlers]
  );

  const connection = useMemo(() => createCogsConnnection(forwardHandlers, options), [forwardHandlers, options]);

  useEffect(() => {
    addHandler({
      onSocketOpen() {
        setConnected(true);
      },
      onSocketClose() {
        setConnected(false);
      },
    });
  }, [addHandler, removeHandler, setConnected]);

  return {
    ...connection,
    addHandler,
    removeHandler,
    connected,
  };
}
