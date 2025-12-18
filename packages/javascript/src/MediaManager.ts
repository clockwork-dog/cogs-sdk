import { getMediaTagName, StableMediaPlayer } from './StableMediaPlayer';

export interface MediaState {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  volume: number;
  loop: boolean;
}

export class MediaManager {
  private currentMediaState: MediaState[] = [];

  private _element: HTMLDivElement = document.createElement('div');
  public get element() {
    return this._element;
  }

  constructor(testStates?: MediaState[]) {
    this.init(testStates);
  }

  async init(testStates?: MediaState[]) {
    const medias = testStates ?? (await this.fetchCurrentMedia());
    medias.forEach((media) => {
      this.createMediaPlayer(media);
    });
  }

  /**
   * This will be called at initialization.
   * This could be polled or COGS could emit events
   */
  async fetchCurrentMedia(): Promise<MediaState[]> {
    return [
      {
        id: '1',
        url: 'cypress/fixtures/test_720p_h264.mov',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        loop: true,
        volume: 1,
      },
    ];
  }

  createMediaPlayer(state: MediaState) {
    const tagName = getMediaTagName(state.url);

    if (tagName === 'img') {
      return;
    }

    const stable = new StableMediaPlayer(state);
    this._element.replaceChildren(...[stable.element]);
  }
}
