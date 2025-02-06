import { CogsConnection, MediaClientConfig } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useCogsMediaConfig<
  MediaConfigExtra,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>(connection: CogsConnection<any>): (MediaClientConfig & MediaConfigExtra) | null {
  const [mediaConfig, setMediaConfig] = useState<(MediaClientConfig & MediaConfigExtra) | null>(null);

  useEffect(() => {
    // Use the latest config in case it has changed before this useEffect ran
    setMediaConfig(connection.mediaConfig as MediaClientConfig & MediaConfigExtra);

    const listener = ({ mediaConfig }: { mediaConfig: MediaClientConfig }) => {
      setMediaConfig(mediaConfig as MediaClientConfig & MediaConfigExtra);
    };

    connection.addEventListener('mediaConfig', listener);
    return () => connection.removeEventListener('mediaConfig', listener);
  }, [connection]);

  return mediaConfig;
}
