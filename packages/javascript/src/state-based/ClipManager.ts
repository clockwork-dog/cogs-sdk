import { MediaClipState } from '../types/MediaSchema';
const DEFAULT_DELAY = 1_000;

/**
 * Each instance of a ClipManager is responsible for displaying
 * an image/audio/video clip in the correct state.
 */
export abstract class ClipManager<T extends MediaClipState> {
  constructor(
    private surfaceElement: HTMLElement,
    private clipElement: HTMLElement,
    state: T,
  ) {
    this._state = state;
    setTimeout(this.loop);
  }

  /**
   * This is the delay to be used in the update loop.
   * It is intended to be dynamic for each loop.
   */
  protected delay = DEFAULT_DELAY;

  protected abstract update(): void;
  public abstract destroy(): void;

  get isConnected() {
    if (!this.surfaceElement) return false;
    if (!this.clipElement) return false;
    if (!this.surfaceElement.contains(this.clipElement)) return false;
    return true;
  }

  protected _state: T;
  setState(newState: T) {
    this._state = newState;
    clearTimeout(this.timeout);
    this.loop();
  }

  private timeout: ReturnType<typeof setTimeout> | undefined;
  private loop = async () => {
    if (this.isConnected) {
      this.update();
      this.timeout = setTimeout(this.loop, this.delay);
    } else {
      this.destroy();
    }
  };
}
