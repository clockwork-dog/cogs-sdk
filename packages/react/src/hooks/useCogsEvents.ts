import { CogsConnection, EventKeyValue } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

type InputEventType<Connection> = Connection extends CogsConnection<infer Types> ? NonNullable<Types['inputEvents']> : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useCogsEvents<Connection extends CogsConnection<any>, Event extends EventKeyValue<InputEventType<Connection>>>(
  connection: Connection,
  handleEvent: (event: Event) => void
): void {
  useEffect(() => {
    const listener = (event: CustomEvent<Event>) => handleEvent(event.detail);
    connection.addEventListener('event', listener);
    return () => connection.removeEventListener('event', listener);
  }, [connection, handleEvent]);
}
