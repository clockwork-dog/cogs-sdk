import { CogsConnection, CogsStateChangedEvent, ManifestTypes } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';
import { ManifestFromConnection } from '../utils/types';

export default function useCogsStateValue<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
  Name extends string & ManifestTypes.StateName<ManifestFromConnection<Connection>>
>(connection: Connection, stateName: Name): ManifestTypes.StateValue<ManifestFromConnection<Connection>, Name> {
  const [value, setValue] = useState<ManifestTypes.StateValue<ManifestFromConnection<Connection>, Name>>(connection.state[stateName]);

  useEffect(() => {
    const listener = ({ state }: CogsStateChangedEvent<Partial<ManifestTypes.StateAsObject<ManifestFromConnection<Connection>>>>) => {
      const value = state[stateName];
      if (value !== undefined) {
        setValue(value);
      }
    };

    connection.addEventListener('state', listener);
    return () => connection.removeEventListener('state', listener);
  }, [connection, stateName]);

  return value;
}
