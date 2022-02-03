export type MediaStatus = 'playing' | 'paused' | 'stopped';

export default interface AllMediaClipStatesMessage {
  mediaType: 'audio' | 'video';
  files: [string, MediaStatus][];
}
