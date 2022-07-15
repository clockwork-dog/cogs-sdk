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

export type Media =
  | {
      type: 'audio';
      preload: boolean;
    }
  | {
      type: 'video';
      preload: boolean | 'auto' | 'metadata' | 'none';
    };

interface MediaClientConfigMessage {
  type: 'media_config_update';
  globalVolume: number;
  audioOutput?: string;
  files: {
    [path: string]: Media;
  };
}

type MediaClientMessage =
  | { type: 'audio_play'; playId: string; file: string; fade?: number; loop?: true; volume: number }
  | { type: 'audio_pause'; file: string; fade?: number }
  | { type: 'audio_stop'; file?: string; fade?: number }
  | { type: 'audio_set_clip_volume'; file: string; volume: number; fade?: number }
  | { type: 'video_play'; playId: string; file: string; loop?: true; volume: number; fit: MediaObjectFit }
  | { type: 'video_pause' }
  | { type: 'video_stop' }
  | { type: 'video_set_volume'; volume: number }
  | { type: 'video_set_fit'; fit: MediaObjectFit }
  | { type: 'image_show'; file: string; fit: MediaObjectFit; hideOthers?: boolean }
  | { type: 'image_hide'; file?: string }
  | { type: 'image_set_fit'; file: string; fit: MediaObjectFit };

// eslint-disable-next-line @typescript-eslint/ban-types
export type CogsClientMessage<CustomConfig = {}> =
  | ShowResetMessage
  | ShowPhaseMessage
  | AdjustableTimerUpdateMessage
  | TextHintsUpdateMessage
  | (MediaClientConfigMessage & CustomConfig)
  | MediaClientMessage;

export default CogsClientMessage;
