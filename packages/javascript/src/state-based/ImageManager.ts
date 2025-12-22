import { ImageState } from '../types/MediaSchema';
import { ClipManager } from './ClipManager';

export class ImageManager extends ClipManager {
  protected destroy(): void {
    // do nothing
  }

  private _element: HTMLImageElement;

  constructor(state: ImageState) {
    super();
    this._element = document.createElement('img');
  }
}
