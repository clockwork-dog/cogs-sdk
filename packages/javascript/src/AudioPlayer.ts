import { Howl, Howler } from 'howler';
import CogsConnection from './CogsConnection';
import { assetSrc } from './helpers/urls';
import { ActiveAudioClipState, ActiveClip, AudioClip, AudioState } from './types/AudioState';
import CogsClientMessage from './types/CogsClientMessage';

interface InternalClipPlayer extends AudioClip {
  player: Howl;
}

type MediaClientConfigMessage = Extract<CogsClientMessage, { type: 'media_config_update' }>;

type EventTypes = {
  state: AudioState;
};

export default class AudioPlayer {
  private eventTarget = new EventTarget();
  private globalVolume = 1;
  private audioClipPlayers: { [path: string]: InternalClipPlayer } = {};

  constructor(connection: CogsConnection) {
    connection.addEventListener('message', (event) => {
      const message = event.detail;
      switch (message.type) {
        case 'media_config_update':
          this.setGlobalVolume(message.globalVolume);
          this.updateConfig(message.files);
          break;
        case 'audio_play':
          this.playAudioClip(message.file, {
            volume: message.volume,
            loop: Boolean(message.loop),
            fade: message.fade,
          });
          break;
        case 'audio_pause':
          this.pauseAudioClip(message.file, message.fade);
          break;
        case 'audio_stop':
          if (message.file) {
            this.stopAudioClip(message.file, { fade: message.fade });
          } else {
            this.stopAllAudioClips();
          }
          break;
        case 'audio_set_clip_volume':
          this.setAudioClipVolume(message.file, { volume: message.volume, fade: message.fade });
          break;
      }
    });
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = volume;
    Howler.volume(volume);
    this.notifyStateListeners();
  }

  playAudioClip(path: string, { volume, fade, loop }: { volume: number; fade?: number; loop: boolean }): void {
    if (!(path in this.audioClipPlayers)) {
      this.audioClipPlayers[path] = createClip(path, { preload: false, ephemeral: true });
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
      const pausedSoundIds = Object.entries(clipPlayer.activeClips)
        .filter(([, { state }]) => state === ActiveAudioClipState.Paused || state === ActiveAudioClipState.Pausing)
        .map(([id]) => parseInt(id));

      // Paused clips need to be played again
      pausedSoundIds.forEach((soundId) => {
        clipPlayer.player.play(soundId);
      });

      // If no currently paused/pausing clips, play a new clip
      const newSoundIds =
        pausedSoundIds.length > 0
          ? []
          : [
              (() => {
                const soundId = clipPlayer.player.play();
                return soundId;
              })(),
            ];

      [...pausedSoundIds, ...newSoundIds].forEach((soundId) => {
        // Cleanup any old callbacks first
        clipPlayer.player.off('fade', undefined, soundId);
        clipPlayer.player.off('end', undefined, soundId);
        clipPlayer.player.off('stop', undefined, soundId);
        clipPlayer.player.loop(loop, soundId);

        clipPlayer.player.once('stop', () => this.handleStoppedClip(path, soundId), soundId);

        // Looping clips fire the 'end' callback on every loop
        if (!loop) {
          clipPlayer.player.once('end', () => this.handleStoppedClip(path, soundId), soundId);
        }

        const activeClip: ActiveClip = {
          state: ActiveAudioClipState.Playing,
          loop,
          volume,
        };

        // Start fade when clip starts
        if (isFadeValid(fade)) {
          clipPlayer.player.volume(0, soundId);
          clipPlayer.player.once(
            'play',
            () => {
              clipPlayer.player.fade(0, volume, fade * 1000, soundId);
            },
            soundId
          );
        } else {
          clipPlayer.player.volume(volume, soundId);
        }

        // Track new active clip
        clipPlayer.activeClips = { ...clipPlayer.activeClips, [soundId]: activeClip };
      });

      return clipPlayer;
    });
  }

  pauseAudioClip(path: string, fade?: number): void {
    this.updateAudioClipPlayer(path, (clipPlayer) => {
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
                    this.updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: ActiveAudioClipState.Paused }));
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
    });
  }

  stopAudioClip(path: string, { fade }: { fade?: number }): void {
    const clipPlayer = this.audioClipPlayers[path];
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

          this.updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: ActiveAudioClipState.Stopping }));
        } else {
          player.stop(soundId);
        }
      });
    } else {
      Object.keys(activeClips).forEach((soundIdStr) => {
        const soundId = parseInt(soundIdStr);
        player.stop(soundId);
      });
    }
  }

  stopAllAudioClips(): void {
    Object.values(this.audioClipPlayers).forEach((clipPlayer) => {
      if (Object.keys(clipPlayer.activeClips).length) {
        clipPlayer.player.stop();
      }
    });
  }

  setAudioClipVolume(path: string, { volume, fade }: { volume: number; fade?: number }): void {
    if (!(volume >= 0 && volume <= 1)) {
      console.warn('Invalid volume', volume);
      return;
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
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
  }

  private handleStoppedClip(path: string, soundId: number) {
    this.updateAudioClipPlayer(path, (clipPlayer) => {
      delete clipPlayer.activeClips[soundId];
      return clipPlayer;
    });
  }

  private updateActiveAudioClip(path: string, soundId: number, update: (clip: ActiveClip) => ActiveClip) {
    this.updateAudioClipPlayer(path, (clipPlayer) =>
      soundId in clipPlayer.activeClips
        ? { ...clipPlayer, activeClips: { ...clipPlayer.activeClips, [soundId]: update(clipPlayer.activeClips[soundId]) } }
        : clipPlayer
    );
  }

  private updateAudioClipPlayer(path: string, update: (player: InternalClipPlayer) => InternalClipPlayer) {
    if (path in this.audioClipPlayers) {
      this.audioClipPlayers = { ...this.audioClipPlayers, [path]: update(this.audioClipPlayers[path]) };
    }

    // Once last instance of an ephemeral clip is removed, cleanup and remove the player
    const clipPlayer = this.audioClipPlayers[path];
    if (clipPlayer && Object.keys(clipPlayer.activeClips ?? {}).length === 0 && clipPlayer.config.ephemeral) {
      clipPlayer.player.unload();
      delete this.audioClipPlayers[path];
    }

    this.notifyStateListeners();
  }

  private updateConfig(newFiles: MediaClientConfigMessage['files']) {
    const previousClipPlayers = this.audioClipPlayers;
    this.audioClipPlayers = (() => {
      const clipPlayers = { ...previousClipPlayers };

      const removedClips = Object.keys(previousClipPlayers).filter(
        (previousFile) => !(previousFile in newFiles) && !previousClipPlayers[previousFile].config.ephemeral
      );
      removedClips.forEach((file) => {
        const player = previousClipPlayers[file].player;
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
    })();
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    const clips = Object.entries(this.audioClipPlayers).reduce((clips, [path, clipPlayer]) => {
      clips[path] = {
        config: { preload: clipPlayer.config.preload, ephemeral: clipPlayer.config.ephemeral },
        activeClips: clipPlayer.activeClips,
      };
      return clips;
    }, {} as { [path: string]: AudioClip });
    const isPlaying = Object.values(this.audioClipPlayers).some(({ activeClips }) =>
      Object.values(activeClips).some((clip) => clip.state === ActiveAudioClipState.Playing)
    );
    const audioState: AudioState = {
      globalVolume: this.globalVolume,
      isPlaying,
      clips,
    };
    this.dispatchEvent('state', audioState);
  }

  // Type-safe wrapper around EventTarget
  public addEventListener<EventName extends keyof EventTypes>(
    type: EventName,
    listener: (ev: CustomEvent<EventTypes[EventName]>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options);
  }
  public removeEventListener<EventName extends keyof EventTypes>(
    type: EventName,
    listener: (ev: CustomEvent<EventTypes[EventName]>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.eventTarget.removeEventListener(type, listener as EventListener, options);
  }
  private dispatchEvent<EventName extends keyof EventTypes>(type: EventName, detail: EventTypes[EventName]): void {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

function createPlayer(path: string, config: { preload: boolean }) {
  return new Howl({
    src: assetSrc(path),
    autoplay: false,
    loop: false,
    volume: 1,
    html5: !config.preload,
    preload: config.preload,
  });
}

function createClip(file: string, config: InternalClipPlayer['config']): InternalClipPlayer {
  return {
    config,
    player: createPlayer(file, config),
    activeClips: {},
  };
}

function updatedClip(clipPath: string, previousClip: InternalClipPlayer, newConfig: InternalClipPlayer['config']): InternalClipPlayer {
  const clip = { ...previousClip, config: newConfig };
  if (previousClip.config.preload !== newConfig.preload) {
    clip.player.unload();
    clip.player = createPlayer(clipPath, newConfig);
  }
  return clip;
}

function isFadeValid(fade: number | undefined): fade is number {
  return typeof fade === 'number' && !isNaN(fade) && fade > 0;
}
