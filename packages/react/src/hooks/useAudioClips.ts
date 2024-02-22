import { AudioClip, AudioState, CogsAudioPlayer } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useAudioClips(audioPlayer: CogsAudioPlayer | null): { [path: string]: AudioClip } {
  const [audioClips, setAudioClips] = useState<{ [path: string]: AudioClip }>({});

  useEffect(() => {
    const listener = (event: CustomEvent<AudioState>) => setAudioClips(event.detail.clips);
    audioPlayer?.addEventListener('state', listener);
    return () => audioPlayer?.removeEventListener('state', listener);
  }, [audioPlayer]);

  return audioClips;
}
