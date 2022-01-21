import MediaObjectFit from './MediaObjectFit';
import { ShowPhase } from './valueTypes';

// COGS updates/events

interface ShowResetMessage {
  type: 'show_reset';
}

interface ShowPhaseMessage {
  type: 'show_phase';
  phase: ShowPhase;
}

interface AdjustableTimerUpdateMessage {
  type: 'adjustable_timer_update';
  ticking: boolean;
  durationMillis: number;
}

interface TextHintsUpdateMessage {
  type: 'text_hints_update';
  lastSentHint: string;
}

// Media

interface MediaClientConfigMessage {
  type: 'media_config_update';
  globalVolume: number;
  files: {
    [path: string]: {
      preload: boolean;
      type: 'audio' | 'video';
    };
  };
}

type MediaClientMessage =
  | { type: 'audio_play'; file: string; fade?: number; loop?: true; volume: number }
  | { type: 'audio_pause'; file: string; fade?: number }
  | { type: 'audio_stop'; file?: string; fade?: number }
  | { type: 'audio_set_clip_volume'; file: string; volume: number; fade?: number }
  | { type: 'audio_set_loop'; file: string; loop: true | undefined }
  | { type: 'video_play'; file: string; loop?: true; volume: number; fit: MediaObjectFit }
  | { type: 'video_pause' }
  | { type: 'video_stop' }
  | { type: 'video_set_volume'; volume: number }
  | { type: 'video_set_loop'; loop: true | undefined }
  | { type: 'image_show'; file: string; fit: MediaObjectFit; hideOthers?: boolean }
  | { type: 'image_hide'; file?: string };

// eslint-disable-next-line @typescript-eslint/ban-types
export type CogsClientMessage<CustomConfig = {}> =
  | ShowResetMessage
  | ShowPhaseMessage
  | AdjustableTimerUpdateMessage
  | TextHintsUpdateMessage
  | (MediaClientConfigMessage & CustomConfig)
  | MediaClientMessage;

export default CogsClientMessage;
