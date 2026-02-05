import { MediaClipState, MediaSurfaceState } from '../types/MediaSchema';
import { ClipManager } from './ClipManager';
import { ImageManager } from './ImageManager';
import { VideoManager } from './VideoManager';
import { AudioManager } from './AudioManager';

export const DATA_CLIP_ID = 'data-clip-id';
type TaggedElement = HTMLElement & { [DATA_CLIP_ID]?: string };

/**
 * The SurfaceManager will receive state updates and:
 * - Ensure that each clip has a parent element
 * - Instantiate a ClipManager attached to each respective element
 */
export class SurfaceManager {
  private _state: MediaSurfaceState = {};
  public setState(newState: MediaSurfaceState) {
    this._state = newState;
    this.update();
  }
  private _element: HTMLDivElement;
  public get element() {
    return this._element;
  }

  private resources: { [clipId: string]: { element: HTMLElement; manager?: ClipManager<MediaClipState> } } = {};

  constructor(
    private constructAssetUrl: (file: string) => string,
    testState?: MediaSurfaceState,
  ) {
    this._element = document.createElement('div');
    this._element.className = 'surface-manager';
    this._element.style.width = '100%';
    this._element.style.height = '100%';

    this._state = testState || {};
    this.update();
  }

  update() {
    // Destroy stale managers
    Object.entries(this.resources).forEach(([clipId, { element, manager }]) => {
      if (!(clipId in this._state)) {
        delete this.resources[clipId];
        element.remove();
        manager?.destroy();
      }
    });

    // Create and attach new wrapper elements
    const elements = Object.keys(this._state)
      .toSorted()
      .map((clipId) => {
        const resource = this.resources[clipId];
        if (resource) {
          return resource.element;
        } else {
          const element = document.createElement('div') as TaggedElement;
          element.setAttribute(DATA_CLIP_ID, clipId);
          this.resources[clipId] = { element };
          return element;
        }
      });
    this._element.replaceChildren(...elements);

    // Create new managers
    Object.keys(this._state)
      .toSorted()
      .forEach((clipId) => {
        const clip = this._state[clipId]!;
        const resource = this.resources[clipId];
        if (!resource) {
          throw new Error('Failed to create resource');
        }

        if (!resource.manager) {
          switch (clip.type) {
            case 'image':
              resource.manager = new ImageManager(this._element, resource.element, clip, this.constructAssetUrl);
              break;
            case 'audio':
              resource.manager = new AudioManager(this._element, resource.element, clip, this.constructAssetUrl);
              break;
            case 'video':
              resource.manager = new VideoManager(this._element, resource.element, clip, this.constructAssetUrl);
              break;
          }
        } else {
          resource.manager.setState(clip);
        }
      });
  }
}
