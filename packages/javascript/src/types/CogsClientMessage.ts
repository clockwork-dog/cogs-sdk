import MediaObjectFit from './MediaObjectFit';
import { MediaSurfaceState } from './MediaSchema';
import ShowPhase from './ShowPhase';

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

interface CogsEnvironmentMessage {
  type: 'cogs_environment';
  cogsVersion: string;
}

export interface DataStoreItemsClientMessage {
  type: 'data_store_items';
  items: { [key: string]: unknown };
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

export interface MediaClientConfigMessage extends MediaClientConfig {
  type: 'media_config_update';
}

export interface MediaClientConfig {
  globalVolume: number;
  audioOutput?: string;
  files: {
    [path: string]: Media;
  };
  preferOptimizedAudio?: boolean;
  preferOptimizedVideo?: boolean;
  preferOptimizedImages?: boolean;
}

/**
 * @deprecated Legacy media client events
 *
 * media_strategy: 'events' was added to this interface in @clockworkdog/cogs-client@2.12.0
 *
 * If the media_strategy property is missing, cogs-client can detect that it is connected to an
 * older version of COGS that does not support state-based media client messages.
 */
type MediaEventClientMessage = { media_strategy: 'events' } & (
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
  | { type: 'image_set_fit'; file: string; fit: MediaObjectFit }
);
type MediaStateClientMessage = { media_strategy: 'state' } & { type: 'media_state'; state: MediaSurfaceState };

type MediaClientMessage = MediaEventClientMessage | MediaStateClientMessage;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CogsClientMessage<CustomConfig = {}> =
  | ShowResetMessage
  | ShowPhaseMessage
  | AdjustableTimerUpdateMessage
  | TextHintsUpdateMessage
  | (MediaClientConfigMessage & CustomConfig)
  | CogsEnvironmentMessage
  | MediaClientMessage
  | DataStoreItemsClientMessage;

export default CogsClientMessage;
