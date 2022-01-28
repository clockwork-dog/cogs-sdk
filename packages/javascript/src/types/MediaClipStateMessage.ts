export type MediaStatus = 'playing' | 'paused' | 'stopped';

export default interface MediaClipStateMessage {
  playId: string;
  mediaType: 'audio' | 'video';
  file: string;
  status: MediaStatus;
}
