import { CogsConnection, CogsIncomingEvent, ManifestTypes } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';
import { ManifestFromConnection } from '../utils/types';

export default function useCogsEvents<Connection extends CogsConnection<any>>(
  connection: Connection,
  handleEvent: (event: CogsIncomingEvent<ManifestTypes.EventFromCogs<ManifestFromConnection<Connection>>>) => void
): void {
  useEffect(() => {
    const listener = (event: CogsIncomingEvent<ManifestTypes.EventFromCogs<ManifestFromConnection<Connection>>>) => handleEvent(event);
    connection.addEventListener('event', listener);
    return () => connection.removeEventListener('event', listener);
  }, [connection, handleEvent]);
}
