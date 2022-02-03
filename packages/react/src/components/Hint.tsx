import { CogsConnection } from '@clockworkdog/cogs-client';
import React from 'react';
import useHint from '../hooks/useHint';
import { useCogsConnection } from '../providers/CogsConnectionProvider';

export default function Hint({ connection: customConnection }: { connection: CogsConnection }): JSX.Element | null {
  const providerConnection = useCogsConnection();
  const connection = customConnection ?? providerConnection;
  const hint = useHint(connection);
  return hint ? <>{hint}</> : null;
}
