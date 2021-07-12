import { CogsConnection, EventKeyValue } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

type InputEventType<Connection> = Connection extends CogsConnection<infer Types> ? NonNullable<Types['inputEvents']> : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useCogsEvent<Connection extends CogsConnection<any>, EventKey extends keyof InputEventType<Connection>>(
  connection: Connection,
  eventKey: EventKey,
  handleEvent: (event: EventKeyValue<Pick<InputEventType<Connection>, EventKey>>['value']) => void
): void {
  useEffect(() => {
    const listener = (event: CustomEvent<EventKeyValue<Pick<InputEventType<Connection>, EventKey>>>) => {
      if (event.detail.key === eventKey) {
        handleEvent(event.detail.value);
      }
    };

    connection.addEventListener('event', listener);
    return () => connection.removeEventListener('event', listener);
  }, [connection, eventKey, handleEvent]);
}
