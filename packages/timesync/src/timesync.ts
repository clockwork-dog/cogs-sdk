import { setDate } from './setDate';

export interface TimeSyncRequestData {
  timesync: { id: number };
}
export interface TimeSyncResponseData {
  timesync: { id: number; now: number };
}
export interface TimeSyncClient {
  receive(data: TimeSyncResponseData): void;
  destroy(): void;
}
export interface TimeSyncServer {
  receive(data: TimeSyncRequestData): void;
}

interface PendingRequest {
  complete(receivedAt: number, now: number): void;
}
interface CompletedRequest {
  sentAt: number;
  receivedAt: number;
  serverNow: number;
  clientNow: number;
}

let id = 0;
function getId() {
  return ++id;
}

const SYNC_SAMPLE_SIZE = 5;
const SYNC_REQUEST_TIMEOUT = 10_000;

export function createTimeSyncClient({
  interval,
  send,
  onChange = setDate,
  syncSampleSize = SYNC_SAMPLE_SIZE,
  syncRequestTimeout = SYNC_REQUEST_TIMEOUT,
}: {
  interval: number;
  send: (data: TimeSyncRequestData) => void | Promise<void>;
  onChange?: (now: number) => void;
  syncSampleSize?: number;
  syncRequestTimeout?: number;
}): TimeSyncClient {
  const requests: Record<string, PendingRequest> = {};

  async function synchronize() {
    const promises: Promise<CompletedRequest | null>[] = [];

    // Send a series of requests
    for (let i = 0; i < syncSampleSize; i++) {
      const promise = new Promise<CompletedRequest | null>((resolve) => {
        const id = getId();
        const clientNow = Date.now();
        const sentAt = performance.now();
        send({ timesync: { id } });

        const complete = (receivedAt: number, serverNow: number) => resolve({ sentAt, receivedAt, serverNow, clientNow });

        requests[id] = { complete };
        setTimeout(() => resolve(null), syncRequestTimeout);
      });
      promises.push(promise);
      await promise;
    }

    // Perform calculation with results
    const results = (await Promise.all(promises)).filter((result) => result !== null);
    const delta = calculateDelta(results);
    if (!isNaN(delta)) {
      onChange(Date.now() + delta);
    }
  }

  const receive = (data: TimeSyncResponseData) => {
    const receivedAt = performance.now();
    const req = requests[data.timesync.id];
    if (!req) return;

    req.complete(receivedAt, data.timesync.now);
  };

  synchronize();
  const loop = setInterval(synchronize, interval);
  const destroy = () => {
    clearInterval(loop);
  };

  return {
    receive,
    destroy,
  };
}

export function calculateDelta(results: CompletedRequest[]) {
  return (
    results
      .map(({ sentAt, receivedAt, clientNow, serverNow }) => {
        const halfLatency = (receivedAt - sentAt) / 2;
        return serverNow - clientNow - halfLatency;
      })
      .reduce((d1, d2) => d1 + d2, 0) / results.length
  );
}

export function createTimeSyncServer({ send }: { send: (data: TimeSyncResponseData) => void | Promise<void> }): TimeSyncServer {
  return {
    receive(data) {
      const { id } = data.timesync;
      send({ timesync: { id, now: Date.now() } });
    },
  };
}
