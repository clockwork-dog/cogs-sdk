export type ActiveAudioClipState =
  | { type: 'paused' }
  | { type: 'pause_requested'; fade: number | undefined } // Pause has been requested but clip is in process of playing, and will be paused once it starts playing
  | { type: 'pausing' } // Clip is currently pausing with a fade
  | { type: 'playing' }
  | { type: 'play_requested' } // Play has been requested but clip hasn't actually started playing yet
  | { type: 'stopping' } // Clip is currently stopping with a fade
  | { type: 'stop_requested'; fade: number | undefined }; // Stop has been requested but clip is in process of playing, and will be stopped once it starts playing

export interface AudioClip {
  config: { preload: boolean; ephemeral: boolean };
  activeClips: { [soundId: number]: ActiveClip };
}

export interface ActiveClip {
  state: ActiveAudioClipState;
  loop: boolean;
  volume: number;
  playId: string;
}

export interface AudioState {
  isPlaying: boolean;
  globalVolume: number;
  clips: { [path: string]: AudioClip };
}
