export enum ActiveAudioClipState {
  Paused = 'paused',
  Pausing = 'pausing',
  Playing = 'playing',
  Stopping = 'stopping',
}

export interface AudioClip {
  config: { preload: boolean; ephemeral: boolean };
  activeClips: { [soundId: number]: ActiveClip };
}

export interface ActiveClip {
  state: ActiveAudioClipState;
  loop: boolean;
  volume: number;
}

export type AudioState = { [path: string]: AudioClip };
