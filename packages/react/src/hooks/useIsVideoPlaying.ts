import { useEffect, useState } from 'react';
import { CogsMessageEvent, getStateAtTime } from '@clockworkdog/cogs-client';
import { useCogsConnection } from '..';

export function useIsVideoPlaying(): boolean {
  const [isVideoPlaying, setVideoPlaying] = useState(false);
  const cogsConnection = useCogsConnection();

  // Listen to messages
  useEffect(() => {
    function handleMessages({ message }: CogsMessageEvent) {
      if (message.type === 'media_state' && message.media_strategy === 'state') {
        const videoPlaybackRates = Object.values(message.state)
          .filter((clip) => clip.type === 'video')
          .map((clip) => getStateAtTime(clip, Date.now())?.rate);
        setVideoPlaying(videoPlaybackRates.some((rate) => rate !== 0));
      }
    }

    cogsConnection.addEventListener('message', handleMessages);
    return () => cogsConnection.removeEventListener('message', handleMessages);
  }, [cogsConnection]);

  return isVideoPlaying;
}
