import { describe, vi, expect, it } from 'vitest';
import { createTimeSyncServer, createTimeSyncClient } from './timesync';

describe('createTimeSyncServer', () => {
  it('returns correct id and current Date', () => {
    const send = vi.fn();
    vi.setSystemTime(0);
    const server = createTimeSyncServer({ send });

    server.receive({ timesync: { id: 10 } });
    expect(send).toHaveBeenCalledWith({ timesync: { id: 10, now: 0 } });
  }, 2_000);
});

describe('createTimeSyncClient', () => {
  it('waits for response between sends', async () => {
    const send = vi.fn();
    const onChange = vi.fn();
    createTimeSyncClient({ interval: 10_000, send, onChange });
    await new Promise((res) => setTimeout(res, 100));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('stops sending after destroy has been called', async () => {
    const send = vi.fn();
    const onChange = vi.fn();
    const client = createTimeSyncClient({ interval: 0, send, onChange });
    const initialCallCount = send.mock.calls.length;
    expect(initialCallCount).toBe(1);

    await new Promise((res) => setTimeout(res, 20));
    client.destroy();
    const newCallCount = send.mock.calls.length;
    expect(newCallCount).toBeGreaterThan(initialCallCount);

    await new Promise((res) => setTimeout(res, 20));
    const finalCallCount = send.mock.calls.length;
    expect(finalCallCount).toEqual(newCallCount);
  });

  it('can receive unknown responses', () => {
    const send = vi.fn();
    const onChange = vi.fn();
    const client = createTimeSyncClient({ interval: 10, send, onChange });
    client.receive({ timesync: { id: 1000, now: 0 } });
  });

  it('handles unresponsive server', async () => {
    const send = vi.fn();
    const onChange = vi.fn();
    createTimeSyncClient({
      interval: 10_000,
      send,
      onChange,
      syncRequestTimeout: 0,
      syncSampleSize: 10,
    });

    await new Promise((res) => setTimeout(res, 20));
    expect(send).toHaveBeenCalledTimes(10);
    expect(onChange).not.toHaveBeenCalled();
  });
});
