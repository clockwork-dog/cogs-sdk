import React from 'react';
import useHint from '../hooks/useHint';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

export default function Hint({ connection }: { connection: CogsConnectionHandler }): JSX.Element | null {
  const hint = useHint(connection);
  return hint ? <>{hint}</> : null;
}
