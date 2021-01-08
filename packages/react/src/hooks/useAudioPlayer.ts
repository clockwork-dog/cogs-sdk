import { CogsClientMessage } from '@clockworkdog/cogs-client';
import { Howl, Howler } from 'howler';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { assetSrc } from '../helpers/urls';
import ClipState from '../types/ClipState';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

type MediaClientConfigMessage = Extract<CogsClientMessage, { type: 'media_config_update' }>;

export interface AudioClip {
  config: { preload: boolean; ephemeral: boolean };
  state: ClipState;
  player: Howl;
}

export default function useAudioPlayer(connection: CogsConnectionHandler): { isPlaying: boolean } {
  const [globalVolume, setGlobalVolume] = useState(1);

  const [audioClips, setAudioClips] = useState<{
    [id: string]: AudioClip;
  }>({});

  const isPlaying = useMemo(() => Object.values(audioClips).some(({ state }) => state === ClipState.Playing), [audioClips]);

  useEffect(() => {
    Howler.volume(globalVolume);
  }, [globalVolume]);

  const setClipState = useCallback(
    (clipId: string, state: ClipState) =>
      setAudioClips((clips) => {
        const clip = clips[clipId];
        return clip ? { ...clips, [clipId]: { ...clip, state } } : clips;
      }),
    [setAudioClips]
  );

  const stopOrUnloadClip = useCallback(
    (file: string, shouldUnloadClip: (clip: AudioClip) => boolean) =>
      setAudioClips((previousClips) => {
        const clips = { ...previousClips };
        const clip = clips[file];
        if (!clip) {
          return clips;
        }
        if (shouldUnloadClip(clip)) {
          clips[file].player.unload();
          delete clips[file];
        } else {
          clips[file] = { ...clip, state: ClipState.Stopped };
        }
        return clips;
      }),
    [setAudioClips]
  );

  const createPlayer = useCallback(
    (file: string, config: { preload: boolean }) => {
      return new Howl({
        src: assetSrc(file),
        autoplay: false,
        loop: false,
        volume: 1,
        html5: !config.preload,
        preload: config.preload,
        onplay: () => setClipState(file, ClipState.Playing),
        onpause: () => setClipState(file, ClipState.Paused),
        onstop: () => {
          stopOrUnloadClip(file, (clip) => clip.config.ephemeral);
        },
        onend: () => {
          stopOrUnloadClip(file, (clip) => clip.config.ephemeral && !clip.player.loop());
        },
      });
    },
    [setClipState, stopOrUnloadClip]
  );

  const createClip = useCallback(
    (file: string, config: AudioClip['config']): AudioClip => ({
      config,
      state: ClipState.Stopped,
      player: createPlayer(file, config),
    }),
    [createPlayer]
  );

  const playAudioClip = useCallback(
    (clipId: string, { fade, loop, volume }: { fade?: number; loop: boolean; volume: number }) =>
      setAudioClips((previousClips) => {
        const clips = { ...previousClips };
        let clip = clips[clipId];
        if (!clip) {
          clip = createClip(clipId, { preload: false, ephemeral: true });
          clips[clipId] = clip;
        }
        clip.player.loop(loop);
        clip.player.play();
        if (typeof fade === 'number' && !isNaN(fade) && fade > 0) {
          clip.player.once('fade', () => {
            clip.player.volume(volume);
          });
          clip.player.fade(0, volume, fade * 1000);
        } else {
          clip.player.volume(volume);
        }
        return clips;
      }),
    [setAudioClips, createClip]
  );

  const stopAudioClip = useCallback(
    (file: string, { fade }: { fade?: number }) =>
      setAudioClips((clips) => {
        const clip = clips[file];
        if (clip) {
          if (typeof fade === 'number' && !isNaN(fade) && fade > 0) {
            clip.player.once('fade', () => {
              clip.player.stop();
            });
            clip.player.fade(clip.player.volume(), 0, fade * 1000);
          } else {
            clip.player.stop();
          }
        }
        return clips;
      }),
    [setAudioClips]
  );

  const pauseAudioClip = useCallback(
    (clipId: string) =>
      setAudioClips((clips) => {
        clips[clipId]?.player.pause();
        return clips;
      }),
    [setAudioClips]
  );

  const stopAllAudioClips = useCallback(
    () =>
      setAudioClips((clips) => {
        Object.values(clips).forEach((clip) => {
          clip.player.stop();
          clip.player.volume(1);
        });
        return clips;
      }),
    [setAudioClips]
  );

  const setAudioClipVolume = useCallback(
    (clipId: string, { volume, fade }: { volume: number; fade?: number }) =>
      setAudioClips((previousClips) => {
        const clips = { ...previousClips };
        const clip = clips[clipId];
        if (clip) {
          if (volume >= 0 && volume <= 1) {
            if (typeof fade === 'number' && !isNaN(fade) && fade > 0) {
              clip.player.fade(clip.player.volume(), volume, fade * 1000);
            } else {
              clip.player.volume(volume);
            }
          } else {
            console.warn('Invalid volume', volume);
          }
        }
        return clips;
      }),
    [setAudioClips]
  );

  const updatedClip = useCallback(
    (clipId: string, previousClip: AudioClip, newConfig: AudioClip['config']): AudioClip => {
      const clip = { ...previousClip, config: newConfig };
      if (previousClip.config.preload !== newConfig.preload) {
        clip.player.stop();
        clip.player.unload();
        clip.player = createPlayer(clipId, newConfig);
      }
      return clip;
    },
    [createPlayer]
  );

  const updateConfig = useCallback(
    (newFiles: MediaClientConfigMessage['files']) =>
      setAudioClips((previousClips) => {
        const clips = { ...previousClips };

        const removedClips = Object.keys(previousClips).filter(
          (previousFile) => !(previousFile in newFiles) && !previousClips[previousFile].config.ephemeral
        );
        removedClips.forEach((file) => {
          const player = previousClips[file].player;
          player.stop();
          player.unload();
          delete clips[file];
        });

        const addedClips = Object.entries(newFiles).filter(([newfile]) => !previousClips[newfile]);
        addedClips.forEach(([file, config]) => {
          clips[file] = createClip(file, { ...config, ephemeral: false });
        });

        const updatedClips = Object.keys(previousClips).filter((previousFile) => previousFile in newFiles);
        updatedClips.forEach((file) => {
          clips[file] = updatedClip(file, clips[file], { ...newFiles[file], ephemeral: false });
        });

        return clips;
      }),
    [setAudioClips, createClip, updatedClip]
  );

  const onMessage = useCallback(
    (message: CogsClientMessage) => {
      switch (message.type) {
        case 'media_config_update':
          setGlobalVolume(message.globalVolume);
          updateConfig(message.files);
          break;
        case 'audio_play':
          playAudioClip(message.file, {
            volume: message.volume,
            loop: Boolean(message.loop),
            fade: message.fade,
          });
          break;
        case 'audio_pause':
          pauseAudioClip(message.file);
          break;
        case 'audio_stop':
          if (message.file) {
            stopAudioClip(message.file, { fade: message.fade });
          } else {
            stopAllAudioClips();
          }
          break;
        case 'audio_set_clip_volume':
          setAudioClipVolume(message.file, { volume: message.volume, fade: message.fade });
          break;
      }
    },
    [updateConfig, playAudioClip, stopAudioClip, pauseAudioClip, stopAllAudioClips, setAudioClipVolume, setGlobalVolume]
  );

  useEffect(() => {
    const handler = { onMessage };
    connection.addHandler(handler);
    return () => {
      connection.removeHandler(handler);
    };
  }, [connection, onMessage]);

  return { isPlaying };
}
