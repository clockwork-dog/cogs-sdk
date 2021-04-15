import { AudioState, CogsAudioPlayer } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useIsAudioPlaying(audioPlayer: CogsAudioPlayer): boolean {
  const [isAudioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const listener = (event: CustomEvent<AudioState>) => setAudioPlaying(event.detail.isPlaying);
    audioPlayer.addEventListener('state', listener);
    return () => audioPlayer.removeEventListener('state', listener);
  }, [audioPlayer]);

  return isAudioPlaying;
}
