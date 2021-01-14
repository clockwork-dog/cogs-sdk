import { Callbacks } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

export default function useCogsCallbacks(connection: CogsConnectionHandler, callbacks: Callbacks): void {
  return useEffect(() => {
    connection.addHandler(callbacks);
    return () => {
      connection.removeHandler(callbacks);
    };
  }, [connection, callbacks]);
}
