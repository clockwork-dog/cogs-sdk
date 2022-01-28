import CogsConnection from './CogsConnection';
import { assetUrl } from './helpers/urls';
import { ActiveVideoClipState, VideoClip, VideoState } from './types/VideoState';
import MediaClipStateMessage, { MediaStatus } from './types/MediaClipStateMessage';
import CogsClientMessage from './types/CogsClientMessage';
import { MediaObjectFit } from '.';

interface InternalClipPlayer extends VideoClip {
  videoElement: HTMLVideoElement;
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
  private parentElement: HTMLElement;

  constructor(cogsConnection: CogsConnection, parentElement: HTMLElement = DEFAULT_PARENT_ELEMENT) {
    this.parentElement = parentElement;

    // Send the current status of each clip to COGS
    this.addEventListener('videoClipState', ({ detail }) => {
      cogsConnection.sendMediaClipState(detail);
    });

    // Listen for video control messages
    cogsConnection.addEventListener('message', (event) => {
      const message = event.detail;
      switch (message.type) {
        case 'media_config_update':
          this.setGlobalVolume(message.globalVolume);
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
        case 'video_set_loop':
          this.setVideoClipLoop({ loop: message.loop });
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
      clipPlayer.videoElement.volume = clipPlayer.volume * globalVolume;
    });
    this.globalVolume = globalVolume;
    this.notifyStateListeners();
  }

  playVideoClip(path: string, { playId, volume, loop, fit }: { playId: string; volume: number; loop: boolean; fit: MediaObjectFit }): void {
    if (this.activeClip) {
      if (this.activeClip.path !== path) {
        this.stopVideoClip();
      }
    } else {
      if (!this.videoClipPlayers[path]) {
        this.videoClipPlayers[path] = this.createClipPlayer(path, { preload: false, ephemeral: true, fit });
      }
    }

    this.activeClip = { path, playId };

    this.updateVideoClipPlayer(path, (clipPlayer) => {
      clipPlayer.volume = volume;
      clipPlayer.videoElement.volume = volume * this.globalVolume;
      clipPlayer.videoElement.loop = loop;
      clipPlayer.videoElement.style.objectFit = fit;
      if (clipPlayer.videoElement.currentTime === clipPlayer.videoElement.duration) {
        clipPlayer.videoElement.currentTime = 0;
      }
      clipPlayer.videoElement.play();
      clipPlayer.videoElement.style.display = 'block';
      return clipPlayer;
    });
  }

  pauseVideoClip(): void {
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
    if (this.activeClip) {
      this.handleStoppedClip(this.activeClip.path);
    }
  }

  setVideoClipVolume({ volume }: { volume: number }): void {
    if (!this.activeClip) {
      return;
    }

    if (!(volume >= 0 && volume <= 1)) {
      console.warn('Invalid volume', volume);
      return;
    }

    this.updateVideoClipPlayer(this.activeClip.path, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.volume = volume * this.globalVolume;
      }
      return clipPlayer;
    });
  }

  setVideoClipLoop({ loop }: { loop: true | undefined }): void {
    if (!this.activeClip) {
      return;
    }

    this.updateVideoClipPlayer(this.activeClip.path, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.loop = loop || false;
      }
      return clipPlayer;
    });
  }

  setVideoClipFit({ fit }: { fit: MediaObjectFit }): void {
    if (!this.activeClip) {
      return;
    }

    this.updateVideoClipPlayer(this.activeClip.path, (clipPlayer) => {
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

    // Once an ephemeral clip stops, cleanup and remove the player
    if (this.videoClipPlayers[this.activeClip.path].config.ephemeral) {
      this.unloadClip(path);
    }

    const playId = this.activeClip.playId;
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

  private updateConfig(newPaths: MediaClientConfigMessage['files']) {
    const newVideoPaths = Object.fromEntries(Object.entries(newPaths).filter(([, { type }]) => type === 'video' || !type));

    const previousClipPlayers = this.videoClipPlayers;
    this.videoClipPlayers = (() => {
      const clipPlayers = { ...previousClipPlayers };

      const removedClips = Object.keys(previousClipPlayers).filter(
        (previousPath) => !(previousPath in newVideoPaths) && !previousClipPlayers[previousPath].config.ephemeral
      );
      removedClips.forEach((path) => {
        this.unloadClip(path);
        delete clipPlayers[path];
      });

      const addedClips = Object.entries(newVideoPaths).filter(([newFile]) => !previousClipPlayers[newFile]);
      addedClips.forEach(([path, config]) => {
        clipPlayers[path] = this.createClipPlayer(path, { ...config, ephemeral: false, fit: 'contain' });
      });

      const updatedClips = Object.entries(previousClipPlayers).filter(([previousPath]) => previousPath in newVideoPaths);
      updatedClips.forEach(([path, previousClipPlayer]) => {
        if (previousClipPlayer.config.preload !== newVideoPaths[path].preload) {
          this.unloadClip(path);
          clipPlayers[path] = this.createClipPlayer(path, { ...previousClipPlayer.config, preload: newVideoPaths[path].preload, ephemeral: false });
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
            volume: this.videoClipPlayers[this.activeClip.path].videoElement?.volume ?? 0,
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

  private createVideoElement(path: string, config: { preload: boolean; fit: MediaObjectFit }, { volume }: { volume: number }) {
    const videoElement = document.createElement('video');
    videoElement.src = assetUrl(path);
    videoElement.autoplay = false;
    videoElement.loop = false;
    videoElement.volume = this.globalVolume * volume;
    videoElement.preload = config.preload ? 'metadata' : 'none';
    videoElement.addEventListener('playing', () => {
      if (this.activeClip?.path === path) {
        this.notifyClipStateListeners(this.activeClip.playId, path, 'playing');
      }
    });
    videoElement.addEventListener('ended', () => {
      if (!videoElement.loop) {
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
    return {
      config,
      videoElement: this.createVideoElement(path, config, { volume }),
      volume,
    };
  }

  private unloadClip(path: string) {
    if (this.activeClip?.path === path) {
      this.activeClip = undefined;
    }
    this.videoClipPlayers[path]?.videoElement.remove();
    this.updateVideoClipPlayer(path, () => null);
  }
}
