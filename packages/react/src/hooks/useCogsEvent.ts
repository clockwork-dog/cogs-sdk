import { CogsConnection, CogsIncomingEventTypes, ManifestTypes } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';
import { ManifestFromConnection } from '../utils/types';

export default function useCogsEvent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
  EventName extends string & ManifestTypes.EventNameFromCogs<ManifestFromConnection<Connection>>
>(
  connection: Connection,
  eventName: EventName,
  handleEvent: (
    value: Extract<CogsIncomingEventTypes<ManifestTypes.EventFromCogs<ManifestFromConnection<Connection>>>, { name: EventName }>['value'],
    name: EventName
  ) => void
): void {
  useEffect(() => {
    const listener = (event: ManifestTypes.EventFromCogs<ManifestFromConnection<Connection>>) => {
      if (event.name === eventName) {
        handleEvent(event.value, eventName);
      }
    };

    connection.addEventListener('event', listener);
    return () => connection.removeEventListener('event', listener);
  }, [connection, eventName, handleEvent]);
}
