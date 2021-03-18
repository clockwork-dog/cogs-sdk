import { Callbacks, CogsClientMessage } from '@clockworkdog/cogs-client';
import { Howl, Howler } from 'howler';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { assetSrc } from '../helpers/urls';
import ActiveAudioClipState from '../types/ActiveAudioClipState';

import CogsConnectionHandler from '../types/CogsConnectionHandler';
import useCogsCallbacks from './useCogsCallbacks';

type MediaClientConfigMessage = Extract<CogsClientMessage, { type: 'media_config_update' }>;

export interface AudioClip {
  config: { preload: boolean; ephemeral: boolean };
  activeClips: { [soundId: number]: ActiveClip };
}

interface InternalClipPlayer extends AudioClip {
  player: Howl;
}

export interface ActiveClip {
  state: ActiveAudioClipState;
  loop: boolean;
  volume: number;
}

export default function useAudioPlayer(
  connection: CogsConnectionHandler,
  { onChanged }: { onChanged?: (config: { [path: string]: AudioClip }) => void } = {}
): { isPlaying: boolean } {
  const [globalVolume, setGlobalVolume] = useState(1);

  const [audioClipPlayers, setAudioClipPlayers] = useState<{ [path: string]: InternalClipPlayer }>({});

  const updateAudioClipPlayer = useCallback((path: string, update: (player: InternalClipPlayer) => InternalClipPlayer) => {
    setAudioClipPlayers((previousClipPlayers) =>
      path in previousClipPlayers ? { ...previousClipPlayers, [path]: update(previousClipPlayers[path]) } : previousClipPlayers
    );
  }, []);

  const updateActiveAudioClip = useCallback(
    (path: string, soundId: number, update: (clip: ActiveClip) => ActiveClip) =>
      updateAudioClipPlayer(path, (player) =>
        soundId in player.activeClips ? { ...player, activeClips: { ...player.activeClips, [soundId]: update(player.activeClips[soundId]) } } : player
      ),
    [updateAudioClipPlayer]
  );

  const handleStoppedClip = useCallback((path: string, soundId: number) => {
    setAudioClipPlayers((players) => {
      if (!(path in players)) {
        return players;
      }
      players = { ...players };
      const clipPlayer = players[path];
      const activeClips = { ...clipPlayer.activeClips };
      delete activeClips[soundId];

      clipPlayer.activeClips = activeClips;
      players[path] = clipPlayer;

      // Once last instance of an ephemeral clip has stopped, cleanup and remove the player
      if (Object.keys(clipPlayer.activeClips).length === 0 && clipPlayer.config.ephemeral) {
        clipPlayer.player.unload();
        delete players[path];
      }
      return players;
    });
  }, []);

  useEffect(() => {
    if (onChanged) {
      onChanged(
        Object.entries(audioClipPlayers).reduce((clips, [path, clipPlayer]) => {
          clips[path] = {
            config: { preload: clipPlayer.config.preload, ephemeral: clipPlayer.config.ephemeral },
            activeClips: clipPlayer.activeClips,
          };
          return clips;
        }, {} as { [path: string]: AudioClip })
      );
    }
  }, [audioClipPlayers, onChanged]);

  const isPlaying = useMemo(
    () =>
      Object.values(audioClipPlayers).some(({ activeClips }) =>
        Object.values(activeClips).some((clip) => clip.state === ActiveAudioClipState.Playing)
      ),
    [audioClipPlayers]
  );

  useEffect(() => {
    Howler.volume(globalVolume);
  }, [globalVolume]);

  const createPlayer = useCallback((path: string, config: { preload: boolean }) => {
    return new Howl({
      src: assetSrc(path),
      autoplay: false,
      loop: false,
      volume: 1,
      html5: !config.preload,
      preload: config.preload,
    });
  }, []);

  const createClip = useCallback(
    (file: string, config: InternalClipPlayer['config']): InternalClipPlayer => ({
      config,
      player: createPlayer(file, config),
      activeClips: {},
    }),
    [createPlayer]
  );

  function isFadeValid(fade: number | undefined): fade is number {
    return typeof fade === 'number' && !isNaN(fade) && fade > 0;
  }

  const playAudioClip = useCallback(
    (clipPath: string, { volume, fade, loop }: { volume: number; fade?: number; loop: boolean }) =>
      setAudioClipPlayers((previousClipPlayers) => {
        const clips = { ...previousClipPlayers };
        let clip = clips[clipPath];
        if (!clip) {
          clip = createClip(clipPath, { preload: false, ephemeral: true });
          clips[clipPath] = clip;
        } else {
          clip = { ...clip };
          clips[clipPath] = clip;
        }

        const pausedSoundIds = Object.entries(clip.activeClips)
          .filter(([, { state }]) => state === ActiveAudioClipState.Paused || state === ActiveAudioClipState.Pausing)
          .map(([id]) => parseInt(id));

        // Paused clips need to be played again
        pausedSoundIds.forEach((soundId) => {
          clip.player.play(soundId);
        });

        // If no currently paused/pausing clips, play a new clip
        const newSoundIds =
          pausedSoundIds.length > 0
            ? []
            : [
                (() => {
                  const soundId = clip.player.play();
                  return soundId;
                })(),
              ];

        [...pausedSoundIds, ...newSoundIds].forEach((soundId) => {
          // Cleanup any old callbacks first
          clip.player.off('fade', undefined, soundId);
          clip.player.off('end', undefined, soundId);
          clip.player.off('stop', undefined, soundId);
          clip.player.loop(loop, soundId);

          clip.player.once('stop', () => handleStoppedClip(clipPath, soundId), soundId);

          // Looping clips fire the 'end' callback on every loop
          if (!loop) {
            clip.player.once('end', () => handleStoppedClip(clipPath, soundId), soundId);
          }

          const activeClip: ActiveClip = {
            state: ActiveAudioClipState.Playing,
            loop,
            volume,
          };

          // Start fade when clip starts
          if (isFadeValid(fade)) {
            clip.player.volume(0, soundId);
            clip.player.once(
              'play',
              () => {
                clip.player.fade(0, volume, fade * 1000, soundId);
              },
              soundId
            );
          } else {
            clip.player.volume(volume, soundId);
          }

          // Track new active clip
          clip.activeClips = { ...clip.activeClips, [soundId]: activeClip };
        });

        return clips;
      }),
    [createClip, handleStoppedClip]
  );

  const stopAudioClip = useCallback(
    (path: string, { fade }: { fade?: number }) => {
      const clipPlayer = audioClipPlayers[path];
      if (!clipPlayer) {
        return;
      }
      const { player, activeClips } = clipPlayer;

      // Cleanup any old fade callbacks first
      player.off('fade');

      if (isFadeValid(fade)) {
        // Start fade out for each non-paused active clip
        Object.entries(activeClips).forEach(([soundIdStr, clip]) => {
          const soundId = parseInt(soundIdStr);
          if (clip.state === ActiveAudioClipState.Playing || clip.state === ActiveAudioClipState.Pausing) {
            player.fade(player.volume(soundId) as number, 0, fade * 1000, soundId);
            // Set callback after starting new fade, otherwise it will fire straight away as the previous fade is cancelled
            player.once('fade', (soundId) => player.stop(soundId), soundId);

            updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: ActiveAudioClipState.Stopping }));
          } else {
            player.stop(soundId);
          }
        });
      } else {
        player.stop();
      }
    },
    [audioClipPlayers, updateActiveAudioClip]
  );

  const pauseAudioClip = useCallback(
    (path: string, fade?: number) =>
      updateAudioClipPlayer(path, (clipPlayer) => {
        return {
          ...clipPlayer,
          activeClips: Object.fromEntries(
            Object.entries(clipPlayer.activeClips)
              .filter(([, clip]) => clip.state === ActiveAudioClipState.Playing)
              .map(([soundIdStr, clip]) => {
                const soundId = parseInt(soundIdStr);

                if (isFadeValid(fade)) {
                  // Fade then pause
                  clipPlayer.player.once(
                    'fade',
                    (soundId) => {
                      clipPlayer.player.pause(soundId);
                      updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: ActiveAudioClipState.Paused }));
                    },
                    soundId
                  );
                  clipPlayer.player.fade(clipPlayer.player.volume(soundId) as number, 0, fade * 1000, soundId);
                  return [soundIdStr, { ...clip, state: ActiveAudioClipState.Pausing }] as const;
                } else {
                  // Pause now
                  clipPlayer.player.pause(soundId);
                  return [soundId, { ...clip, state: ActiveAudioClipState.Paused }] as const;
                }
              })
          ),
        };
      }),
    [updateAudioClipPlayer, updateActiveAudioClip]
  );

  const stopAllAudioClips = useCallback(() => Object.values(audioClipPlayers).forEach((clipPlayer) => clipPlayer.player.stop()), [audioClipPlayers]);

  const setAudioClipVolume = useCallback(
    (path: string, { volume, fade }: { volume: number; fade?: number }) => {
      if (!(volume >= 0 && volume <= 1)) {
        console.warn('Invalid volume', volume);
        return;
      }

      updateAudioClipPlayer(path, (clipPlayer) => {
        return {
          ...clipPlayer,
          activeClips: Object.fromEntries(
            Object.entries(clipPlayer.activeClips).map(([soundIdStr, clip]) => {
              // Ignored for pausing/stopping instances
              if (clip.state === ActiveAudioClipState.Playing || clip.state === ActiveAudioClipState.Paused) {
                const soundId = parseInt(soundIdStr);

                if (isFadeValid(fade)) {
                  clipPlayer.player.fade(clipPlayer.player.volume(soundId) as number, volume, fade * 1000);
                } else {
                  clipPlayer.player.volume(volume);
                }

                return [soundIdStr, { ...clip, volume }] as const;
              } else {
                return [soundIdStr, clip] as const;
              }
            })
          ),
        };
      });
    },
    [updateAudioClipPlayer]
  );

  const updatedClip = useCallback(
    (clipPath: string, previousClip: InternalClipPlayer, newConfig: InternalClipPlayer['config']): InternalClipPlayer => {
      const clip = { ...previousClip, config: newConfig };
      if (previousClip.config.preload !== newConfig.preload) {
        clip.player.stop();
        clip.player.unload();
        clip.player = createPlayer(clipPath, newConfig);
      }
      return clip;
    },
    [createPlayer]
  );

  const updateConfig = useCallback(
    (newFiles: MediaClientConfigMessage['files']) =>
      setAudioClipPlayers((previousClipPlayers) => {
        const clipPlayers = { ...previousClipPlayers };

        const removedClips = Object.keys(previousClipPlayers).filter(
          (previousFile) => !(previousFile in newFiles) && !previousClipPlayers[previousFile].config.ephemeral
        );
        removedClips.forEach((file) => {
          const player = previousClipPlayers[file].player;
          player.stop();
          player.unload();
          delete clipPlayers[file];
        });

        const addedClips = Object.entries(newFiles).filter(([newfile]) => !previousClipPlayers[newfile]);
        addedClips.forEach(([path, config]) => {
          clipPlayers[path] = createClip(path, { ...config, ephemeral: false });
        });

        const updatedClips = Object.keys(previousClipPlayers).filter((previousFile) => previousFile in newFiles);
        updatedClips.forEach((path) => {
          clipPlayers[path] = updatedClip(path, clipPlayers[path], { ...newFiles[path], ephemeral: false });
        });

        return clipPlayers;
      }),
    [createClip, updatedClip]
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
          pauseAudioClip(message.file, message.fade);
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

  const callbacks = useMemo((): Callbacks => ({ onMessage }), [onMessage]);
  useCogsCallbacks(connection, callbacks);

  return { isPlaying };
}
