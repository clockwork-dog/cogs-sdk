import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useCogsInputPortValues<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
>(connection: Connection): Connection['state'] {
  const [value, setValue] = useState<Connection['state']>(connection.state);

  useEffect(() => {
    // Use the latest state in case it has changed before this useEffect ran
    setValue(connection.state);

    const listener = () => setValue(connection.state);
    connection.addEventListener('state', listener);
    return () => connection.removeEventListener('state', listener);
  }, [connection]);

  return value;
}
