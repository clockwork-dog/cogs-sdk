import { describe, test, expect, vi } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { createTimeSyncClient, createTimeSyncServer } from './timesync';

describe('e2e', () => {
  test('web socket', async () => {
    let requestSend = false;
    let requestReceive = false;
    let responseSend = false;
    let responseReceive = false;
    const onChange = vi.fn();

    // Setup server
    const server = new WebSocketServer({ port: 8080 });
    server.on('connection', (socket) => {
      // How to send timesync response
      const timeSyncServer = createTimeSyncServer({
        send: (data) => {
          responseSend = true;
          socket.send(JSON.stringify(data));
        },
      });

      // How to accept timesync request
      socket.on('message', (message) => {
        try {
          const json = JSON.parse(String(message));
          if (json.timesync) {
            requestReceive = true;
            timeSyncServer.receive(json);
          }
        } catch (e) {
          console.error(e);
        }
      });
    });

    // Make a connection
    const socket = new WebSocket('ws://localhost:8080');
    socket.addEventListener('open', () => {
      //How to send timesync request
      const timeSyncClient = createTimeSyncClient({
        interval: 60_000,
        send: (data) => {
          requestSend = true;
          socket.send(JSON.stringify(data));
        },
        onChange,
      });

      //How to receive timesync response
      socket.addEventListener('message', (message) => {
        try {
          const json = JSON.parse(String(message.data));
          if (json.timesync) {
            responseReceive = true;
            timeSyncClient.receive(json);
          }
        } catch (e) {
          console.error(e);
        }
      });
      socket.addEventListener('close', () => {
        timeSyncClient.destroy();
      });
    });

    await new Promise((res) => setTimeout(res, 100));

    expect(requestSend).toBe(true);
    expect(requestReceive).toBe(true);
    expect(responseSend).toBe(true);
    expect(responseReceive).toBe(true);
    expect(onChange).toHaveBeenCalledWith(expect.any(Number));
  });
});
