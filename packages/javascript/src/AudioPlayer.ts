import { Howl, Howler } from 'howler';
import CogsConnection from './CogsConnection';
import { assetUrl } from './helpers/urls';
import { ActiveClip, AudioClip, AudioState } from './types/AudioState';
import MediaClipStateMessage, { MediaStatus } from './types/MediaClipStateMessage';
import CogsClientMessage, { Media } from './types/CogsClientMessage';

const DEBUG = true;

interface InternalClipPlayer extends AudioClip {
  player: Howl;
}

type MediaClientConfigMessage = Extract<CogsClientMessage, { type: 'media_config_update' }>;

type EventTypes = {
  state: AudioState;
  audioClipState: MediaClipStateMessage;
};

export default class AudioPlayer {
  private eventTarget = new EventTarget();
  private globalVolume = 1;
  private audioClipPlayers: { [path: string]: InternalClipPlayer } = {};
  private sinkId = '';

  constructor(cogsConnection: CogsConnection) {
    // Send the current status of each clip to COGS
    this.addEventListener('audioClipState', ({ detail }) => {
      cogsConnection.sendMediaClipState(detail);
    });

    // Listen for audio control messages
    cogsConnection.addEventListener('message', (event) => {
      const message = event.detail;
      switch (message.type) {
        case 'media_config_update':
          if (this.globalVolume !== message.globalVolume) {
            this.setGlobalVolume(message.globalVolume);
          }
          if (message.audioOutput !== undefined) {
            const sinkId = cogsConnection.getAudioSinkId(message.audioOutput);
            this.setAudioSink(sinkId ?? '');
          }
          this.updateConfig(message.files);
          break;
        case 'audio_play':
          this.playAudioClip(message.file, {
            playId: message.playId,
            volume: message.volume,
            loop: Boolean(message.loop),
            fade: message.fade,
          });
          break;
        case 'audio_pause':
          this.pauseAudioClip(message.file, { fade: message.fade });
          break;
        case 'audio_stop':
          if (message.file) {
            this.stopAudioClip(message.file, { fade: message.fade });
          } else {
            this.stopAllAudioClips({ fade: message.fade });
          }
          break;
        case 'audio_set_clip_volume':
          this.setAudioClipVolume(message.file, { volume: message.volume, fade: message.fade });
          break;
      }
    });

    // On connection, send the current playing state of all clips
    // (Usually empty unless websocket is reconnecting)
    const sendInitialClipStates = () => {
      const files = Object.entries(this.audioClipPlayers).map(([file, player]) => {
        const activeClips = Object.values(player.activeClips);
        const status = activeClips.some(
          ({ state }) =>
            state.type === 'playing' ||
            state.type === 'pausing' ||
            state.type === 'stopping' ||
            state.type === 'play_requested' ||
            state.type === 'pause_requested' ||
            state.type === 'stop_requested'
        )
          ? ('playing' as const)
          : activeClips.some(({ state }) => state.type === 'paused')
          ? ('paused' as const)
          : ('stopped' as const);
        return [file, status] as [string, typeof status];
      });
      cogsConnection.sendInitialMediaClipStates({ mediaType: 'audio', files });
    };

    cogsConnection.addEventListener('open', sendInitialClipStates);
    sendInitialClipStates();
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = volume;
    Howler.volume(volume);
    this.notifyStateListeners();
  }

  playAudioClip(path: string, { playId, volume, fade, loop }: { playId: string; volume: number; fade?: number; loop: boolean }): void {
    log('Playing clip', { path });

    if (!(path in this.audioClipPlayers)) {
      log('Creating ephemeral clip', { path });
      this.audioClipPlayers[path] = this.createClip(path, { preload: false, ephemeral: true });
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
      // Paused clips need to be played again
      const pausedSoundIds = Object.entries(clipPlayer.activeClips)
        .filter(([, { state }]) => state.type === 'paused' || state.type === 'pausing')
        .map(([id]) => parseInt(id));

      pausedSoundIds.forEach((soundId) => {
        log('Resuming paused clip', { soundId });
        clipPlayer.player.play(soundId);
      });

      // Clips with pause requested no longer need to pause, they can continue playing now
      const pauseRequestedSoundIds = Object.entries(clipPlayer.activeClips)
        .filter(([, { state }]) => state.type === 'pause_requested')
        .map(([id]) => parseInt(id));

      // If no currently paused/pausing/pause_requested clips, play a new clip
      const newSoundIds = pausedSoundIds.length > 0 || pauseRequestedSoundIds.length > 0 ? [] : [clipPlayer.player.play()];

      // paused and pause_requested clips treated the same, they should have their properties
      // updated with the latest play action's properties
      [...pausedSoundIds, ...pauseRequestedSoundIds, ...newSoundIds].forEach((soundId) => {
        clipPlayer.player.loop(loop, soundId);

        // Cleanup any old callbacks first
        clipPlayer.player.off('play', undefined, soundId);
        clipPlayer.player.off('pause', undefined, soundId);
        clipPlayer.player.off('fade', undefined, soundId);
        clipPlayer.player.off('end', undefined, soundId);
        clipPlayer.player.off('stop', undefined, soundId);

        clipPlayer.player.once('stop', () => this.handleStoppedClip(path, playId, soundId), soundId);

        // Looping clips fire the 'end' callback on every loop
        clipPlayer.player.on(
          'end',
          () => {
            if (!clipPlayer.activeClips[soundId]?.loop) {
              this.handleStoppedClip(path, playId, soundId);
            }
          },
          soundId
        );

        const activeClip: ActiveClip = {
          playId,
          state: { type: 'play_requested' },
          loop,
          volume,
        };

        // Once clip starts, check if it should actually be paused or stopped
        // If not, then update state to 'playing'
        clipPlayer.player.once(
          'play',
          () => {
            const clipState = clipPlayer.activeClips[soundId].state;
            if (clipState.type === 'pause_requested') {
              log('Clip started playing but should be paused', { path, soundId });
              this.pauseAudioClip(path, { fade: clipState.fade }, soundId, true);
            } else if (clipState.type === 'stop_requested') {
              log('Clip started playing but should be stopped', { path, soundId });
              this.stopAudioClip(path, { fade: clipState.fade }, soundId, true);
            } else {
              this.updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: { type: 'playing' } }));
            }
          },
          soundId
        );

        // To fade or to no fade?
        if (isFadeValid(fade)) {
          // Start fade when clip starts
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

        // Track new/updated active clip
        clipPlayer.activeClips = { ...clipPlayer.activeClips, [soundId]: activeClip };
      });

      return clipPlayer;
    });

    this.notifyClipStateListeners(playId, path, 'playing');
  }

  pauseAudioClip(path: string, { fade }: { fade?: number }, onlySoundId?: number, allowIfPauseRequested?: boolean): void {
    // No active clips to pause
    if (Object.keys(this.audioClipPlayers[path]?.activeClips ?? {}).length === 0) {
      return;
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
      clipPlayer.activeClips = Object.fromEntries(
        Object.entries(clipPlayer.activeClips).map(([soundIdStr, clip]) => {
          const soundId = parseInt(soundIdStr);

          // If onlySoundId specified, only update that clip
          if (onlySoundId === undefined || onlySoundId === soundId) {
            if ((allowIfPauseRequested && clip.state.type === 'pause_requested') || clip.state.type === 'playing' || clip.state.type === 'pausing') {
              if (isFadeValid(fade)) {
                // Fade then pause
                clipPlayer.player.once(
                  'fade',
                  (soundId) => {
                    clipPlayer.player.pause(soundId);
                    this.updateActiveAudioClip(path, soundId, (clip) => ({ ...clip, state: { type: 'paused' } }));
                    this.notifyClipStateListeners(clip.playId, path, 'paused');
                  },
                  soundId
                );

                clipPlayer.player.fade(clipPlayer.player.volume(soundId) as number, 0, fade * 1000, soundId);
                clip.state = { type: 'pausing' };
              } else {
                // Pause now
                clipPlayer.player.pause(soundId);
                clip.state = { type: 'paused' };
                this.notifyClipStateListeners(clip.playId, path, 'paused');
              }
            }
            // Clip hasn't started playing yet, or has already had pause_requested (but fade may have changed so update here)
            else if (clip.state.type === 'play_requested' || clip.state.type === 'pause_requested') {
              clip.state = { type: 'pause_requested', fade };
            }
          }

          return [soundIdStr, clip];
        })
      );

      return clipPlayer;
    });
  }

  stopAudioClip(path: string, { fade }: { fade?: number }, onlySoundId?: number, allowIfStopRequested?: boolean): void {
    // No active clips to stop
    if (Object.keys(this.audioClipPlayers[path]?.activeClips ?? {}).length === 0) {
      return;
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
      clipPlayer.activeClips = Object.fromEntries(
        Object.entries(clipPlayer.activeClips).map(([soundIdStr, clip]) => {
          const soundId = parseInt(soundIdStr);

          // If onlySoundId specified, only update that clip
          if (onlySoundId === undefined || onlySoundId === soundId) {
            if (
              (allowIfStopRequested && clip.state.type === 'stop_requested') ||
              clip.state.type === 'playing' ||
              clip.state.type === 'pausing' ||
              clip.state.type === 'paused' ||
              clip.state.type === 'stopping'
            ) {
              if (isFadeValid(fade) && clip.state.type !== 'paused') {
                // Cleanup any old fade callbacks first
                // TODO: Remove cast once https://github.com/DefinitelyTyped/DefinitelyTyped/pull/59411 is merged
                clipPlayer.player.off('fade', soundId);

                clipPlayer.player.fade(clipPlayer.player.volume(soundId) as number, 0, fade * 1000, soundId);
                // Set callback after starting new fade, otherwise it will fire straight away as the previous fade is cancelled
                clipPlayer.player.once('fade', (soundId) => clipPlayer.player.stop(soundId), soundId);

                clip.state = { type: 'stopping' };
              } else {
                clipPlayer.player.stop(soundId);
              }
            }
            // Clip hasn't started playing yet, or has already had stop_requested (but fade may have changed so update here)
            // or has pause_requested, but stop takes precedence
            else if (clip.state.type === 'play_requested' || clip.state.type === 'pause_requested' || clip.state.type === 'stop_requested') {
              log("Trying to stop clip which hasn't started playing yet", { path, soundId });
              clip.state = { type: 'stop_requested', fade };
            }
          }

          return [soundIdStr, clip];
        })
      );

      return clipPlayer;
    });
  }

  stopAllAudioClips(options: { fade?: number }): void {
    log('Stopping all clips');
    Object.keys(this.audioClipPlayers).forEach((path) => {
      this.stopAudioClip(path, options);
    });
  }

  setAudioClipVolume(path: string, { volume, fade }: { volume: number; fade?: number }): void {
    if (!(volume >= 0 && volume <= 1)) {
      console.warn('Invalid volume', volume);
      return;
    }

    // No active clips to set volume for
    if (Object.keys(this.audioClipPlayers[path]?.activeClips ?? {}).length === 0) {
      return;
    }

    this.updateAudioClipPlayer(path, (clipPlayer) => {
      clipPlayer.activeClips = Object.fromEntries(
        Object.entries(clipPlayer.activeClips).map(([soundIdStr, clip]) => {
          // Ignored for pausing/stopping instances
          if (clip.state.type !== 'pausing' && clip.state.type !== 'stopping') {
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
      );

      return clipPlayer;
    });
  }

  private handleStoppedClip(path: string, playId: string, soundId: number) {
    this.updateAudioClipPlayer(path, (clipPlayer) => {
      delete clipPlayer.activeClips[soundId];
      return clipPlayer;
    });

    this.notifyClipStateListeners(playId, path, 'stopped');
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

  setAudioSink(sinkId: string): void {
    log(`Setting sink ID for all clips:`, sinkId);
    for (const clipPlayer of Object.values(this.audioClipPlayers)) {
      setPlayerSinkId(clipPlayer.player, sinkId);
    }
    this.sinkId = sinkId;
  }

  private updateConfig(newFiles: MediaClientConfigMessage['files']) {
    const newAudioFiles = Object.fromEntries(
      Object.entries(newFiles).filter((file): file is [string, Extract<Media, { type: 'audio' }>] => {
        const type = file[1].type;
        // COGS 4.6 did not send a `type` but only reported audio files
        // so we assume audio if no `type` is given
        return type === 'audio' || !type;
      })
    );

    const previousClipPlayers = this.audioClipPlayers;
    this.audioClipPlayers = (() => {
      const clipPlayers = { ...previousClipPlayers };

      const removedClips = Object.keys(previousClipPlayers).filter(
        (previousFile) => !(previousFile in newAudioFiles) && !previousClipPlayers[previousFile].config.ephemeral
      );
      removedClips.forEach((file) => {
        const player = previousClipPlayers[file].player;
        player.unload();
        delete clipPlayers[file];
      });

      const addedClips = Object.entries(newAudioFiles).filter(([newfile]) => !previousClipPlayers[newfile]);
      addedClips.forEach(([path, config]) => {
        clipPlayers[path] = this.createClip(path, { ...config, ephemeral: false });
      });

      const updatedClips = Object.keys(previousClipPlayers).filter((previousFile) => previousFile in newAudioFiles);
      updatedClips.forEach((path) => {
        clipPlayers[path] = this.updatedClip(path, clipPlayers[path], { ...newAudioFiles[path], ephemeral: false });
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
      Object.values(activeClips).some((clip) => clip.state.type === 'playing' || clip.state.type === 'pausing' || clip.state.type === 'stopping')
    );
    const audioState: AudioState = {
      globalVolume: this.globalVolume,
      isPlaying,
      clips,
    };
    this.dispatchEvent('state', audioState);
  }

  private notifyClipStateListeners(playId: string, file: string, status: MediaStatus) {
    this.dispatchEvent('audioClipState', { mediaType: 'audio', playId, file, status });
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

  private createPlayer(path: string, config: { preload: boolean }) {
    const player = new Howl({
      src: assetUrl(path),
      autoplay: false,
      loop: false,
      volume: 1,
      html5: true,
      preload: config.preload,
    });
    setPlayerSinkId(player, this.sinkId);
    return player;
  }

  private createClip(file: string, config: InternalClipPlayer['config']): InternalClipPlayer {
    return {
      config,
      player: this.createPlayer(file, config),
      activeClips: {},
    };
  }

  private updatedClip(clipPath: string, previousClip: InternalClipPlayer, newConfig: InternalClipPlayer['config']): InternalClipPlayer {
    const clip = { ...previousClip, config: newConfig };
    if (previousClip.config.preload !== newConfig.preload) {
      clip.player.unload();
      clip.player = this.createPlayer(clipPath, newConfig);
    }
    return clip;
  }
}

function log(...data: any[]): void {
  if (DEBUG) {
    console.log(...data);
  }
}

function isFadeValid(fade: number | undefined): fade is number {
  return typeof fade === 'number' && !isNaN(fade) && fade > 0;
}

function setPlayerSinkId(player: Howl, sinkId: string | undefined) {
  if (sinkId === undefined) {
    return;
  }

  if ((player as any)._html5) {
    (player as any)._sounds.forEach((sound: { _node: HTMLAudioElement }) => {
      (sound._node as any).setSinkId(sinkId);
    });
  } else {
    // TODO: handle web audio
    console.warn('Cannot set sink ID: web audio not supported', player);
  }
}
