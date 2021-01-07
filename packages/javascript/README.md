# COGS Client library

Create content for your COGS Media Master

## Add to your project

```shell
npm install --save @clockwork-dog/cogs-client
```

or

```shell
yarn add @clockwork-dog/cogs-client
```

## Usage

Import the library

```ts
import { createCogsClient } from '@clockwork-dog/cogs-client';
```

or

```js
const { createCogsClient } = require('@clockwork-dog/cogs-client');
```

then

```ts
let connected = false;
let websocket = null;

websocket = createCogsWebsocket({
  onSocketOpen: () => {
    connected = true;
  },
  onSocketClose: () => {
    connected = false;
    websocket = null;
  },
  onUpdates: (updates) => {
    // Handle updates. See 'types/Callback.ts`
  };
  onEvent: (eventKey, eventValue) => {
    // Handle event. See 'types/Callback.ts`
  };
  onConfig: (config) => {
    // Handle new config. See 'types/Callback.ts`
  };
  onMessage: (message) => {
    // Handle message. See `types/CogsClientMessage.ts`
  };
});
```
