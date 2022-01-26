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
  private activeClipPath?: string;
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

  playVideoClip(path: string, { volume, loop, fit }: { volume: number; loop: boolean; fit: MediaObjectFit }): void {
    if (this.activeClipPath) {
      if (this.activeClipPath !== path) {
        this.stopVideoClip();
      }
    } else {
      if (!this.videoClipPlayers[path]) {
        this.videoClipPlayers[path] = this.createClipPlayer(path, { preload: false, ephemeral: true, fit });
      }
    }

    this.activeClipPath = path;

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
    if (this.activeClipPath) {
      const path = this.activeClipPath;
      this.updateVideoClipPlayer(path, (clipPlayer) => {
        clipPlayer.videoElement?.pause();
        return clipPlayer;
      });
      this.notifyClipStateListeners(path, 'paused');
    }
  }

  stopVideoClip(): void {
    if (this.activeClipPath) {
      this.handleStoppedClip(this.activeClipPath);
    }
  }

  setVideoClipVolume({ volume }: { volume: number }): void {
    if (!this.activeClipPath) {
      return;
    }

    if (!(volume >= 0 && volume <= 1)) {
      console.warn('Invalid volume', volume);
      return;
    }

    this.updateVideoClipPlayer(this.activeClipPath, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.volume = volume;
      }
      return clipPlayer;
    });
  }

  setVideoClipLoop({ loop }: { loop: true | undefined }): void {
    if (!this.activeClipPath) {
      return;
    }

    this.updateVideoClipPlayer(this.activeClipPath, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.loop = loop || false;
      }
      return clipPlayer;
    });
  }

  setVideoClipFit({ fit }: { fit: MediaObjectFit }): void {
    if (!this.activeClipPath) {
      return;
    }

    this.updateVideoClipPlayer(this.activeClipPath, (clipPlayer) => {
      if (clipPlayer.videoElement) {
        clipPlayer.videoElement.style.objectFit = fit;
      }
      return clipPlayer;
    });
  }

  private handleStoppedClip(path: string) {
    // Once an ephemeral clip stops, cleanup and remove the player
    if (this.activeClipPath === path && this.videoClipPlayers[this.activeClipPath].config.ephemeral) {
      this.unloadClip(path);
    }

    this.activeClipPath = undefined;
    this.updateVideoClipPlayer(path, (clipPlayer) => {
      clipPlayer.videoElement.pause();
      clipPlayer.videoElement.currentTime = 0;
      clipPlayer.videoElement.style.display = 'none';
      return clipPlayer;
    });
    this.notifyClipStateListeners(path, 'stopped');
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
      });

      const addedClips = Object.entries(newVideoPaths).filter(([newFile]) => !previousClipPlayers[newFile]);
      addedClips.forEach(([path, config]) => {
        clipPlayers[path] = this.createClipPlayer(path, { ...config, ephemeral: false, fit: 'contain' });
      });

      const updatedClips = Object.entries(previousClipPlayers).filter(([previousPath]) => previousPath in newVideoPaths);
      updatedClips.forEach(([path, previousClipPlayer]) => {
        if (previousClipPlayer.config.preload !== newVideoPaths[path].preload) {
          this.unloadClip(path);
          return this.createClipPlayer(path, { ...previousClipPlayer.config, preload: newVideoPaths[path].preload, ephemeral: false });
        }
      });

      return clipPlayers;
    })();
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    const VideoState: VideoState = {
      globalVolume: this.globalVolume,
      isPlaying: typeof this.activeClipPath === 'string' && !this.videoClipPlayers[this.activeClipPath].videoElement?.paused,
      clips: { ...this.videoClipPlayers },
      activeClip: this.activeClipPath
        ? {
            path: this.activeClipPath,
            state: !this.videoClipPlayers[this.activeClipPath].videoElement?.paused ? ActiveVideoClipState.Playing : ActiveVideoClipState.Paused,
            loop: this.videoClipPlayers[this.activeClipPath].videoElement?.loop ?? false,
            volume: this.videoClipPlayers[this.activeClipPath].videoElement?.volume ?? 0,
          }
        : undefined,
    };
    this.dispatchEvent('state', VideoState);
  }

  private notifyClipStateListeners(file: string, status: MediaStatus) {
    this.dispatchEvent('videoClipState', { mediaType: 'video', file, status });
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
      this.notifyClipStateListeners(path, 'playing');
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
    if (this.activeClipPath === path) {
      this.activeClipPath = undefined;
    }
    this.videoClipPlayers[path]?.videoElement.remove();
    this.updateVideoClipPlayer(path, () => null);
  }
}
