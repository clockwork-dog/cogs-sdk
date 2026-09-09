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

export interface DataStoreItemsClientMessage {
  type: 'data_store_items';
  items: { [key: string]: unknown };
}

export interface CogsVersionMessage {
  type: 'cogs_version';
  version: string;
}

// Media
export type Media =
  | {
      type: 'image';
      preload: 'all' | 'none';
    }
  | {
      type: 'audio';
      preload: 'all' | 'auto' | 'metadata' | 'none';
    }
  | {
      type: 'video';
      preload: 'all' | 'auto' | 'metadata' | 'none';
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

type MediaStateClientMessage = { media_strategy: 'state' } & { type: 'media_state'; state: MediaSurfaceState };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CogsClientMessage<CustomConfig = {}> =
  | ShowResetMessage
  | ShowPhaseMessage
  | AdjustableTimerUpdateMessage
  | TextHintsUpdateMessage
  | (MediaClientConfigMessage & CustomConfig)
  | MediaStateClientMessage
  | DataStoreItemsClientMessage
  | CogsVersionMessage;

export default CogsClientMessage;
