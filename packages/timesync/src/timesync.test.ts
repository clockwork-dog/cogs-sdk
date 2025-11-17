import { describe, vi, expect, it, test } from 'vitest';
import { createTimeSyncServer, createTimeSyncClient, calculateDelta } from './timesync';

describe('calculateDelta()', () => {
  test('10s client-server difference', () => {
    // 10s delta: 1s each way
    // |                                 | client-clock | server-clock |
    // |---------------------------------|--------------|--------------|
    // | client sent request             |  00:00       | (00:10)      |
    // | server responded with its clock | (00:01)      |  00:11       |
    // | client received response        |  00:02       | (00:12)      |
    expect(
      calculateDelta([
        {
          sentAt: 0,
          receivedAt: 2_000,
          clientNow: 0,
          serverNow: 11_000,
        },
      ]),
    ).toBe(10_000);
  });
  test('2s client-server difference, averaging 3 requests', () => {
    // 2s delta: 1s, 3s, 8s each way
    // |                                 | client-clock | server-clock |
    // |---------------------------------|--------------|--------------|
    // | 1st req                                                       |
    // | client sent request             |  00:00       | (00:02)      |
    // | server responded with its clock | (00:01)      |  00:03       |
    // | client received response        |  00:02       | (00:04)      |
    // | 2nd req                                                       |
    // | client sent request             |  00:02       | (00:04)      |
    // | server responded with its clock | (00:05)      |  00:07       |
    // | client received response        |  00:08       | (00:10)      |
    // | 3rd req                                                       |
    // | client sent request             |  00:08       | (00:10)      |
    // | server responded with its clock | (00:16)      |  00:18       |
    // | client received response        |  00:24       | (00:26)      |
    expect(
      calculateDelta([
        {
          sentAt: 0,
          receivedAt: 2_000,
          clientNow: 0,
          serverNow: 3_000,
        },
        {
          sentAt: 2_000,
          receivedAt: 8_000,
          clientNow: 2_000,
          serverNow: 7_000,
        },
        {
          sentAt: 8_000,
          receivedAt: 24_000,
          clientNow: 8_000,
          serverNow: 18_000,
        },
      ]),
    ).toBe(2_000);
  });
  test('-5s client-server difference', () => {
    // -5s delta: 1s each way
    // |                                 | client-clock | server-clock |
    // |---------------------------------|--------------|--------------|
    // | client sent request             |  00:30       | (00:25)      |
    // | server responded with its clock | (00:31)      |  00:26       |
    // | client received response        |  00:32       | (00:27)      |
    expect(
      calculateDelta([
        {
          sentAt: 30_000,
          receivedAt: 32_000,
          clientNow: 30_000,
          serverNow: 26_000,
        },
      ]),
    ).toBe(-5_000);
  });
});

describe('createTimeSyncServer', () => {
  it('returns correct id and current Date', () => {
    const send = vi.fn();
    vi.setSystemTime(0);
    const server = createTimeSyncServer({ send });

    server.receive({ timesync: { id: 10 } });
    expect(send).toHaveBeenCalledWith({ timesync: { id: 10, now: 0 } });
  });
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
