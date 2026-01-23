import { defaultImageOptions, ImageState } from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { ClipManager } from './ClipManager';

export class ImageManager extends ClipManager<ImageState> {
  private imageElement?: HTMLImageElement;

  constructor(surfaceElement: HTMLElement, clipElement: HTMLElement, state: ImageState) {
    super(surfaceElement, clipElement, state);
    this.clipElement = clipElement;
  }

  private updateImageElement() {
    this.imageElement = document.createElement('img');
    this.clipElement.replaceChildren(this.imageElement);
    this.imageElement.style.position = 'absolute';
    this.imageElement.style.height = '100%';
    this.imageElement.style.widows = '100%';
  }

  protected update(): void {
    const currentState = getStateAtTime(this._state, Date.now());

    // Does the <img /> element need adding/removing?
    if (currentState) {
      if (!this.imageElement || !this.isConnected(this.imageElement)) {
        this.updateImageElement();
      }
    } else {
      this.imageElement?.remove();
      this.imageElement = undefined;
    }
    if (!this.imageElement || !currentState) return;

    // this.imageElement.src will be a fully qualified URL
    if (!this.imageElement.src.startsWith(this._state.file)) {
      this.imageElement.src = this._state.file;
    }
    if (this.imageElement.style.objectFit !== this._state.fit) {
      this.imageElement.style.objectFit = this._state.fit;
    }
    if (parseFloat(this.imageElement.style.opacity) !== currentState.opacity) {
      this.imageElement.style.opacity = String(currentState.opacity ?? defaultImageOptions.opacity);
    }
    const z = Math.round(currentState.zIndex ?? defaultImageOptions.zIndex);
    if (parseInt(this.imageElement.style.zIndex) !== z) {
      this.imageElement.style.zIndex = String(z);
    }

    const { opacity } = currentState;
    if (typeof opacity === 'string' && opacity !== this.imageElement.style.opacity) {
      this.imageElement.style.opacity = opacity;
    }
  }

  destroy(): void {
    this.imageElement?.remove();
  }
}
