import { StableMediaPlayer } from './StableMediaPlayer';
import { MediaClipState, MediaSurfaceState } from '../types/MediaSchema';

const DATA_CLIP_ID = 'data-clip-id';
type TaggedElement = HTMLElement & { [DATA_CLIP_ID]?: string };

export class MediaManager {
  private state: MediaSurfaceState = {};

  private _element: HTMLDivElement = document.createElement('div');
  public get element() {
    return this._element;
  }

  constructor(testState?: MediaSurfaceState) {
    this.state = testState || {};
    this.update();
  }

  async update() {
    this.cleanupElements();

    const currentMediaElements = new Set([...this._element.children].map((child) => (child as TaggedElement)[DATA_CLIP_ID]));
    Object.entries(this.state).forEach(([clipId, clip]) => {
      if (!currentMediaElements.has(clipId)) {
        // Create new media element
      }
    });
  }

  private cleanupElements() {
    for (const childElement of this._element.children) {
      const child = childElement as TaggedElement;
      const clipId = child[DATA_CLIP_ID];
      // Remove unknown elements
      if (!clipId) {
        child.remove();
        continue;
      }
      // Remove stale elements
      if (this.state[clipId] === undefined) {
        child.remove();
      }
    }
  }

  createMediaPlayer(clip: MediaClipState) {
    const tagName = getMediaTagName(state.url);

    if (tagName === 'img') {
      return;
    }

    const stable = new StableMediaPlayer(state);
    this._element.replaceChildren(...[stable.element]);
  }
}
