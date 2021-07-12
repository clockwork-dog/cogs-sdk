import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

type InputPortsType<Connection> = Connection extends CogsConnection<infer Types> ? Types['inputPorts'] : never;

export default function useCogsOutputPortValue<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
  PortName extends keyof NonNullable<InputPortsType<Connection>>
>(connection: Connection, portName: PortName): NonNullable<InputPortsType<Connection>>[PortName] {
  const [value, setValue] = useState<NonNullable<InputPortsType<Connection>>[PortName]>(connection.inputPortValues[portName]);

  useEffect(() => {
    const listener = (event: CustomEvent<NonNullable<InputPortsType<Connection>>>) => {
      if (event.detail[portName] !== undefined) {
        setValue(event.detail[portName]);
      }
    };

    connection.addEventListener('updates', listener);
    return () => connection.removeEventListener('updates', listener);
  }, [connection, portName]);

  return value;
}
