import { ImageState } from '../types/MediaSchema';
import { ClipManager } from './ClipManager';

export class ImageManager extends ClipManager<ImageState> {
  protected update(): void {
    throw new Error('Method not implemented.');
  }

  private _element: HTMLImageElement;

  constructor(surfaceElement: HTMLElement, clipElement: HTMLElement, state: ImageState) {
    super(surfaceElement, clipElement, state);
    this._element = document.createElement('img');
  }

  destroy(): void {
    // do nothing
  }
}
