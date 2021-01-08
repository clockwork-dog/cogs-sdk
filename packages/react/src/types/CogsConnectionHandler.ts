import { Callbacks } from '@clockworkdog/cogs-client';

export default interface CogsConnectionHandler {
  addHandler(handler: Callbacks): void;
  removeHandler(handler: Callbacks): void;
}
