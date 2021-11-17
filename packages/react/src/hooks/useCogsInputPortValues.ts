import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

type InputPortsType<Connection> = Connection extends CogsConnection<infer Types> ? Types['inputPorts'] : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useCogsInputPortValues<Connection extends CogsConnection<any>>(connection: Connection): InputPortsType<Connection> {
  const [value, setValue] = useState(connection.inputPortValues);

  useEffect(() => {
    const listener = (event: CustomEvent<InputPortsType<Connection>>) => setValue(event.detail);
    connection.addEventListener('updates', listener);
    return () => connection.removeEventListener('updates', listener);
  }, [connection]);

  return value;
}
