import BackgroundOptions from './BackgroundOptions';
import MediaObjectFit from './MediaObjectFit';

// COGS updates/events

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
  globalVolume: number; // Question: Are all these appropriate for custom content??
  files: { [path: string]: { preload: boolean } };
  background?: BackgroundOptions;
}

type MediaClientMessage =
  | { type: 'audio_play'; file: string; fade?: number; loop?: true; volume: number }
  | { type: 'audio_pause'; file: string; fade?: number }
  | { type: 'audio_stop'; file?: string; fade?: number }
  | { type: 'audio_set_clip_volume'; file: string; volume: number; fade?: number }
  | { type: 'video_play'; file: string; loop?: true; volume: number; fit: MediaObjectFit }
  | { type: 'video_pause'; file: string }
  | { type: 'video_stop'; file?: string }
  | { type: 'video_set_volume'; file: string; volume: number };

export type CogsClientMessage = AdjustableTimerUpdateMessage | TextHintsUpdateMessage | MediaClientConfigMessage | MediaClientMessage;

export default CogsClientMessage;
