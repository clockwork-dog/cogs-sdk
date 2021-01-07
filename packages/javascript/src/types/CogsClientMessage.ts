import BackgroundOptions from './BackgroundOptions';
import MediaObjectFit from './MediaObjectFit';

// Subscriptions

type ShowLifecycleSubscriptionMessage =
  | { type: 'subscription_show_reset' }
  | { type: 'subscription_show_started' }
  | { type: 'subscription_show_finished' }
  | { type: 'subscription_show_cancelled' };

type AdjustableTimerDuration = { durationMillis: number };

type AdjustableTimerSubscriptionMessage =
  | ({ type: 'subscription_timer_started' } & AdjustableTimerDuration)
  | ({ type: 'subscription_timer_stopped' } & AdjustableTimerDuration)
  | ({ type: 'subscription_timer_set'; startedAtOffset?: number } & AdjustableTimerDuration);

type TextHintsSubscription = { type: 'subscription_text_hints_hint_sent'; hint: string };

// Media

interface MediaClientConfigMessage {
  type: 'media_config_update';
  globalVolume: number; // Question: Are all these appropriate for custom content??
  files: { [path: string]: { preload: boolean } };
  background?: BackgroundOptions;
}

type MediaClientMessage =
  | { type: 'audio_play'; file: string; fade?: number; loop?: true; volume: number }
  | { type: 'audio_pause'; file: string }
  | { type: 'audio_stop'; file?: string; fade?: number }
  | { type: 'audio_set_clip_volume'; file: string; volume: number; fade?: number }
  | { type: 'video_play'; file: string; loop?: true; volume: number; fit: MediaObjectFit }
  | { type: 'video_pause'; file: string }
  | { type: 'video_stop'; file?: string }
  | { type: 'video_set_volume'; file: string; volume: number };

export type CogsClientMessage =
  | ShowLifecycleSubscriptionMessage
  | AdjustableTimerSubscriptionMessage
  | TextHintsSubscription
  | MediaClientConfigMessage
  | MediaClientMessage;

export default CogsClientMessage;
