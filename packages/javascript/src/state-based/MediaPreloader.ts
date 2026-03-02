import { MediaClientConfig } from '../types/CogsClientMessage';

export class MediaPreloader {
  private _state: MediaClientConfig['files'];
  private _elements: Record<string, { element: HTMLMediaElement; inUse: boolean; type: 'audio' | 'video' }> = {};
  private _constructAssetURL: (file: string) => string;
  constructor(constructAssetURL: (file: string) => string, testState: MediaClientConfig['files'] = {}) {
    this._constructAssetURL = constructAssetURL;
    this._state = testState;
  }

  get state() {
    return { ...this._state };
  }
  setState(newState: MediaClientConfig['files']) {
    this._state = newState;
    this.update();
  }

  private update() {
    // Clean up previous elements
    for (const [filename, media] of Object.entries(this._elements)) {
      if (!(filename in this._state)) {
        media.element.src = '';
        delete this._elements[filename];
      }
      media.inUse = media.element.isConnected;
    }

    for (const [filename, fileConfig] of Object.entries(this._state)) {
      if (filename in this._elements) {
        continue;
      }
      // Create new elements
      let preloadAttr: 'auto' | 'metadata' | 'none';
      if (fileConfig.preload === true) {
        preloadAttr = 'auto';
      } else if (fileConfig.preload === false) {
        preloadAttr = 'none';
      } else {
        preloadAttr = fileConfig.preload;
      }
      switch (fileConfig.type) {
        case 'audio': {
          const element = document.createElement('audio');
          element.src = this._constructAssetURL(filename);
          element.preload = preloadAttr;
          this._elements[filename] = { element, inUse: false, type: 'audio' };
          break;
        }
        case 'video': {
          const element = document.createElement('video');
          element.src = this._constructAssetURL(filename);
          element.preload = preloadAttr;
          this._elements[filename] = { element, inUse: false, type: 'video' };
          break;
        }
      }
    }
  }

  getElement(file: string, type: 'audio' | 'video') {
    const media = this._elements[file];
    if (media && media.inUse === false) {
      media.inUse = true;
      return media.element;
    } else {
      const element = document.createElement(type);
      element.src = this._constructAssetURL(file);
      this._elements[file] = { element, type, inUse: true };
      return element;
    }
  }

  releaseElement(resource: string | HTMLMediaElement) {
    if (typeof resource === 'string') {
      const media = this._elements[resource];
      if (media) {
        media.inUse = false;
      }
    } else {
      Object.entries(this._elements).forEach(([file, media]) => {
        if (media.element === resource) {
          delete this._elements[file];
        }
      });
    }
  }
}
