import { AudioState, CogsAudioPlayer } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';
import { useAudioPlayer } from '../providers/CogsConnectionProvider';

export default function useIsAudioPlaying(customAudioPlayer?: CogsAudioPlayer | null): boolean {
  const [isAudioPlaying, setAudioPlaying] = useState(false);
  const audioPlayer = useAudioPlayer(customAudioPlayer ?? undefined);

  useEffect(() => {
    const listener = (event: CustomEvent<AudioState>) => setAudioPlaying(event.detail.isPlaying);
    audioPlayer?.addEventListener('state', listener);
    return () => audioPlayer?.removeEventListener('state', listener);
  }, [audioPlayer]);

  return isAudioPlaying;
}
