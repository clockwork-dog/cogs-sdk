export type MediaStatus = 'playing' | 'paused' | 'stopped';

export default interface MediaClipStateMessage {
  mediaType: 'audio' | 'video';
  file: string;
  status: MediaStatus;
}
