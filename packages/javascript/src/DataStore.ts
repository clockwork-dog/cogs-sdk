import { DataStoreItemsClientMessage } from './types/CogsClientMessage';

/**
 * A simple key-value store for storing data in COGS
 *
 * When reconnected the data will be restored.
 */
export default class DataStore<ItemsT extends { [key: string]: unknown } = { [key: string]: unknown }> {
  private _items: ItemsT;

  #eventTarget = new EventTarget();

  constructor(defaultItems: ItemsT) {
    this._items = { ...defaultItems };
  }

  handleDataStoreItemsMessage(message: DataStoreItemsClientMessage): void {
    this._items = { ...this._items, ...message.items };
    Object.entries(message.items).forEach(([key, value]) => {
      this.dispatchEvent(new DataStoreItemEvent(key, value));
    });
    this.dispatchEvent(new DataStoreItemsEvent(message.items));
  }

  public get items(): Readonly<typeof this._items> {
    return this._items;
  }

  public getItem(key: string): unknown | undefined {
    return this._items[key];
  }

  public setItems(partialItems: Partial<ItemsT>): this {
    this._items = { ...this._items, ...partialItems };
    Object.entries(partialItems).forEach(([key, value]) => {
      this.dispatchEvent(new DataStoreItemEvent(key, value));
    });
    this.dispatchEvent(new DataStoreItemsEvent(partialItems));
    return this;
  }

  // Type-safe listeners
  public addEventListener<K extends keyof DataStoreEventMap>(
    type: K,
    listener: (event: DataStoreEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.#eventTarget.addEventListener(type, listener as EventListener, options);
  }
  public removeEventListener<K extends keyof DataStoreEventMap>(
    type: K,
    listener: (event: DataStoreEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void {
    this.#eventTarget.removeEventListener(type, listener as EventListener, options);
  }
  private dispatchEvent<K extends keyof DataStoreEventMap>(event: DataStoreEventMap[K]): void {
    this.#eventTarget.dispatchEvent(event);
  }
}

export class DataStoreItemEvent extends Event {
  public readonly _cogsConnectionEventType = 'item';
  constructor(
    public readonly key: string,
    public readonly value: unknown,
  ) {
    super('item');
  }
}

export class DataStoreItemsEvent extends Event {
  public readonly _cogsConnectionEventType = 'item';
  constructor(public readonly items: { [key: string]: unknown }) {
    super('items');
  }
}

export interface DataStoreEventMap {
  item: DataStoreItemEvent;
  items: DataStoreItemsEvent;
}
