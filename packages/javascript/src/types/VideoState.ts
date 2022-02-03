import { MediaObjectFit } from '..';

export enum ActiveVideoClipState {
  Paused = 'paused',
  Playing = 'playing',
}

export interface VideoClip {
  config: { preload: boolean; ephemeral: boolean; fit: MediaObjectFit };
}

export interface ActiveClip {
  path: string;
  state: ActiveVideoClipState;
  loop: boolean;
  volume: number;
}

export interface VideoState {
  isPlaying: boolean;
  globalVolume: number;
  clips: { [path: string]: VideoClip };
  activeClip?: ActiveClip;
}
