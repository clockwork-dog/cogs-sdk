import CogsConnection from './CogsConnection';
import { assetUrl } from './helpers/urls';
import { ActiveVideoClipState, VideoClip, VideoState } from './types/VideoState';
import MediaClipStateMessage, { MediaStatus } from './types/MediaClipStateMessage';
import CogsClientMessage from './types/CogsClientMessage';
import { MediaObjectFit } from '.';

interface HTMLVideoElementWithAudioSink extends HTMLVideoElement {
  setSinkId?: (sinkId: string) => void;
}

interface InternalClipPlayer extends VideoClip {
  videoElement: HTMLVideoElementWithAudioSink;
  volume: number;
}

type MediaClientConfigMessage = Extract<CogsClientMessage, { type: 'media_config_update' }>;

type EventTypes = {
  state: VideoState;
  videoClipState: MediaClipStateMessage;
};

const DEFAULT_PARENT_ELEMENT = document.body;

export default class VideoPlayer {
  private eventTarget = new EventTarget();
  private globalVolume = 1;
  private videoClipPlayers: { [path: string]: InternalClipPlayer } = {};
  private activeClip?: { path: string; playId: string };
  private pendingClip?: { path: string; playId: string; actionOncePlaying: 'play' | 'pause' | 'stop' };
  private parentElement: HTMLElement;
  private sinkId = '';

  constructor(cogsConnection: CogsConnection<any>, parentElement: HTMLElement = DEFAULT_PARENT_ELEMENT) {
    this.parentElement = parentElement;

    // Send the current status of each clip to COGS
    this.addEventListener('videoClipState', ({ detail }) => {
      cogsConnection.sendMediaClipState(detail);
    });

    // Listen for video control messages
    cogsConnection.addEventListener('message', ({ message }) => {
      switch (message.type) {
        case 'media_config_update':
          this.setGlobalVolume(message.globalVolume);
          if (message.audioOutput !== undefined) {
            const sinkId = cogsConnection.getAudioSinkId(message.audioOutput);
            this.setAudioSink(sinkId ?? '');
          }
          this.updateConfig(message.files);
          break;
        case 'video_play':
          this.playVideoClip(message.file, {
            playId: message.playId,
            volume: message.volume,
            loop: Boolean(message.loop),
            fit: message.fit,
          });
          break;
        case 'video_pause':
          this.pauseVideoClip();
          break;
        case 'video_stop':
          this.stopVideoClip();
          break;
        case 'video_set_volume':
          this.setVideoClipVolume({ volume: message.volume });
          break;
        case 'video_set_fit':
          this.setVideoClipFit({ fit: message.fit });
          break;
      }
    });

    // On connection, send the current playing state of all clips
    // (Usually empty unless websocket is reconnecting)

    const sendInitialClipStates = () => {
      const files = Object.entries(this.videoClipPlayers).map(([file, player]) => {
        const status = !player.videoElement.paused
          ? ('playing' as const)
          : player.videoElement.currentTime === 0 || player.videoElement.currentTime === player.videoElement.duration
          ? ('paused' as const)
          : ('stopped' as const);
        return [file, status] as [string, typeof status];
      });
      cogsConnection.sendInitialMediaClipStates({ mediaType: 'video', files });
    };

    cogsConnection.addEventListener('open', sendInitialClipStates);
    sendInitialClipStates();
  }

  setParentElement(parentElement: HTMLElement): void {
    this.parentElement = parentElement;
    Object.values(this.videoClipPlayers).forEach((clipPlayer) => {
      parentElement.appendChild(clipPlayer.videoElement);
    });
  }

  resetParentElement(): void {
    this.setParentElement(DEFAULT_PARENT_ELEMENT);
  }

  setGlobalVolume(globalVolume: number): void {
    Object.values(this.videoClipPlayers).forEach((clipPlayer) => {
      setVideoElementVolume(clipPlayer.videoElement, clipPlayer.volume * globalVolume);
    });
    this.globalVolume = globalVolume;
    this.notifyStateListeners();
  }

  playVideoClip(path: string, { playId, volume, loop, fit }: { playId: string; volume: number; loop: boolean; fit: MediaObjectFit }): void {
    if (!this.videoClipPlayers[path]) {
      this.videoClipPlayers[path] = this.createClipPlayer(path, { preload: 'none', ephemeral: true, fit });
    }

    // Check if there's already a pending clip, which has now been superseded and abort the play operation
    if (this.pendingClip) {
      this.updateVideoClipPlayer(this.pendingClip.path, (clipPlayer) => {
        clipPlayer.videoElement.load(); // Resets the media element
        return clipPlayer;
      });
    }

    // New pending clip is video being requested
    if (this.activeClip?.path !== path) {
      this.pendingClip = { path, playId, actionOncePlaying: 'play' };
    }

    // Setup and play the pending clip's player
    this.updateVideoClipPlayer(path, (clipPlayer) => {
      clipPlayer.volume = volume;
      setVideoElementVolume(clipPlayer.videoElement, volume * this.globalVolume);
      clipPlayer.videoElement.loop = loop;
      clipPlayer.videoElement.style.objectFit = fit;
      if (clipPlayer.videoElement.currentTime === clipPlayer.videoElement.duration) {
        clipPlayer.videoElement.currentTime = 0;
      }
      clipPlayer.videoElement.play();
      // Display right away if there's currently no active clip
      if (!this.activeClip) {
        clipPlayer.videoElement.style.display = 'block';
      }
      return clipPlayer;
    });
  }

  pauseVideoClip(): void {
    // Pending clip should be paused when it loads and becomes active
    if (this.pendingClip) {
      this.pendingClip.actionOncePlaying = 'pause';
    }

    // Pause the currently active clip
    if (this.activeClip) {
      const { playId, path } = this.activeClip;
      this.updateVideoClipPlayer(path, (clipPlayer) => {
        clipPlayer.videoElement?.pause();
        return clipPlayer;
      });
      this.notifyClipStateListeners(playId, path, 'paused');
    }
  }

  stopVideoClip(): void {
    // Pending clip should be stopped when it loads and becomes active
    if (this.pendingClip) {
      this.pendingClip.actionOncePlaying = 'stop';
    }

    // Stop the currently active clip
    if (this.activeClip) {
      this.handleStoppedClip(this.activeClip.path);
    }
  }

  setVideoClipVolume({ volume }: { volume: number }): void {
    // If there is a pending clip, this is latest to have been played so update its volume
    const clipToUpdate = this.pendingClip ?? this.activeClip ?? undefined;
    if (!clipToUpdate) {
      return;
    }

    if (!(volume >= 0 && volume <= 1)) {
      console.warn('Invalid volume', volume);
      return;
    }

    this.updateVideoClipPlayer(clipToUpdate.path, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.volume = volume;
        setVideoElementVolume(clipPlayer.videoElement, volume * this.globalVolume);
      }
      return clipPlayer;
    });
  }

  setVideoClipFit({ fit }: { fit: MediaObjectFit }): void {
    // If there is a pending clip, this is latest to have been played so update its fit
    const clipToUpdate = this.pendingClip ?? this.activeClip ?? undefined;
    if (!clipToUpdate) {
      return;
    }

    this.updateVideoClipPlayer(clipToUpdate.path, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.style.objectFit = fit;
      }
      return clipPlayer;
    });
  }

  private handleStoppedClip(path: string) {
    if (!this.activeClip || this.activeClip.path !== path) {
      return;
    }

    const playId = this.activeClip.playId;

    // Once an ephemeral clip stops, cleanup and remove the player
    if (this.videoClipPlayers[this.activeClip.path]?.config.ephemeral) {
      this.unloadClip(path);
    }

    this.activeClip = undefined;
    this.updateVideoClipPlayer(path, (clipPlayer) => {
      clipPlayer.videoElement.pause();
      clipPlayer.videoElement.currentTime = 0;
      clipPlayer.videoElement.style.display = 'none';
      return clipPlayer;
    });
    this.notifyClipStateListeners(playId, path, 'stopped');
  }

  private updateVideoClipPlayer(path: string, update: (player: InternalClipPlayer) => InternalClipPlayer | null) {
    if (this.videoClipPlayers[path]) {
      const newPlayer = update(this.videoClipPlayers[path]);
      if (newPlayer) {
        this.videoClipPlayers[path] = newPlayer;
      } else {
        delete this.videoClipPlayers[path];
      }
      this.notifyStateListeners();
    }
  }

  setAudioSink(sinkId: string): void {
    for (const clipPlayer of Object.values(this.videoClipPlayers)) {
      setPlayerSinkId(clipPlayer, sinkId);
    }
    this.sinkId = sinkId;
  }

  private updateConfig(newPaths: MediaClientConfigMessage['files']) {
    const newVideoPaths = Object.fromEntries(Object.entries(newPaths).filter(([, { type }]) => type === 'video' || !type));

    const previousClipPlayers = this.videoClipPlayers;
    this.videoClipPlayers = (() => {
      const clipPlayers = { ...previousClipPlayers };

      const removedClips = Object.keys(previousClipPlayers).filter((previousPath) => !(previousPath in newVideoPaths));
      removedClips.forEach((path) => {
        if (this.activeClip?.path === path && previousClipPlayers[path]?.config.ephemeral === false) {
          this.updateVideoClipPlayer(path, (player) => {
            player.config = { ...player.config, ephemeral: true };
            return player;
          });
        } else {
          this.unloadClip(path);
          delete clipPlayers[path];
        }
      });

      const addedClips = Object.entries(newVideoPaths).filter(([newFile]) => !previousClipPlayers[newFile]);
      addedClips.forEach(([path, config]) => {
        clipPlayers[path] = this.createClipPlayer(path, { ...config, preload: preloadString(config.preload), ephemeral: false, fit: 'contain' });
      });

      const updatedClips = Object.entries(previousClipPlayers).filter(([previousPath]) => previousPath in newVideoPaths);
      updatedClips.forEach(([path, previousClipPlayer]) => {
        if (previousClipPlayer.config.preload !== newVideoPaths[path].preload) {
          this.updateVideoClipPlayer(path, (player) => {
            player.config = {
              ...player.config,
              preload: preloadString(newVideoPaths[path].preload),
              ephemeral: false,
            };
            player.videoElement.preload = player.config.preload;
            return player;
          });
        }
      });

      return clipPlayers;
    })();
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    const VideoState: VideoState = {
      globalVolume: this.globalVolume,
      isPlaying: this.activeClip ? !this.videoClipPlayers[this.activeClip.path].videoElement?.paused : false,
      clips: { ...this.videoClipPlayers },
      activeClip: this.activeClip
        ? {
            path: this.activeClip.path,
            state: !this.videoClipPlayers[this.activeClip.path].videoElement?.paused ? ActiveVideoClipState.Playing : ActiveVideoClipState.Paused,
            loop: this.videoClipPlayers[this.activeClip.path].videoElement?.loop ?? false,
            volume: this.videoClipPlayers[this.activeClip.path].videoElement?.muted
              ? 0
              : this.videoClipPlayers[this.activeClip.path].videoElement?.volume ?? 0,
          }
        : undefined,
    };
    this.dispatchEvent('state', VideoState);
  }

  private notifyClipStateListeners(playId: string, file: string, status: MediaStatus) {
    this.dispatchEvent('videoClipState', { playId, mediaType: 'video', file, status });
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

  private createVideoElement(path: string, config: VideoClip['config'], { volume }: { volume: number }) {
    const videoElement = document.createElement('video');
    videoElement.playsInline = true; // Required for iOS
    videoElement.src = assetUrl(path);
    videoElement.autoplay = false;
    videoElement.loop = false;
    setVideoElementVolume(videoElement, volume * this.globalVolume);
    videoElement.preload = config.preload;
    videoElement.addEventListener('playing', () => {
      // If the clip is still the pending one when it actually start playing, then ensure it is in the correct state
      if (this.pendingClip?.path === path) {
        switch (this.pendingClip.actionOncePlaying) {
          case 'play': {
            // Continue playing, show the video element, and notify listeners
            videoElement.style.display = 'block';
            this.notifyClipStateListeners(this.pendingClip.playId, path, 'playing');
            break;
          }
          case 'pause': {
            // Pause playback, show the video element, and notify listeners
            videoElement.style.display = 'block';
            videoElement.pause();
            this.notifyClipStateListeners(this.pendingClip.playId, path, 'paused');
            break;
          }
          case 'stop': {
            // Pause playback, leave the video element hidden, and notify listeners
            videoElement.pause();
            this.notifyClipStateListeners(this.pendingClip.playId, path, 'stopped');
            break;
          }
        }

        // If there was a previously active clip, then stop it
        if (this.activeClip) {
          this.handleStoppedClip(this.activeClip.path);
        }

        this.activeClip = this.pendingClip;
        this.pendingClip = undefined;
      } else if (this.activeClip?.path === path) {
        // If we were the active clip then just notify listeners that we are now playing
        this.notifyClipStateListeners(this.activeClip.playId, path, 'playing');
      } else {
        // Otherwise it shouldn't be playing, like because another clip became pending before we loaded,
        // so we pause and don't show or notify listeners
        videoElement.pause();
      }
    });
    videoElement.addEventListener('ended', () => {
      // Ignore if there's a pending clip, as once that starts playing the active clip will be stopped
      // Also ignore if the video is set to loop
      if (!this.pendingClip && !videoElement.loop) {
        this.handleStoppedClip(path);
      }
    });
    videoElement.style.position = 'absolute';
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = config.fit;
    videoElement.style.display = 'none';
    this.parentElement.appendChild(videoElement);
    return videoElement;
  }

  private createClipPlayer(path: string, config: InternalClipPlayer['config']): InternalClipPlayer {
    const volume = 1;
    const player = {
      config,
      videoElement: this.createVideoElement(path, config, { volume }),
      volume,
    };
    setPlayerSinkId(player, this.sinkId);
    return player;
  }

  private unloadClip(path: string) {
    if (this.activeClip?.path === path) {
      const playId = this.activeClip.playId;
      this.activeClip = undefined;
      this.notifyClipStateListeners(playId, path, 'stopped');
    }
    this.videoClipPlayers[path]?.videoElement.remove();
    this.updateVideoClipPlayer(path, () => null);
  }
}

function preloadString(preload: boolean | 'auto' | 'metadata' | 'none'): 'auto' | 'metadata' | 'none' {
  return typeof preload === 'string' ? preload : preload ? 'auto' : 'none';
}

function setPlayerSinkId(player: InternalClipPlayer, sinkId: string | undefined) {
  if (sinkId === undefined) {
    return;
  }

  if (typeof player.videoElement.setSinkId === 'function') {
    player.videoElement.setSinkId(sinkId);
  }
}

/**
 * Set video volume
 *
 * This doesn't work on iOS (volume is read-only) so at least mute it if the volume is zero
 */
function setVideoElementVolume(videoElement: HTMLVideoElement, volume: number) {
  videoElement.volume = volume;
  videoElement.muted = volume === 0;
}
