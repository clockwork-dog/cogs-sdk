# COGS Client library

Create content for your COGS Media Master

## [Documentation](https://clockwork-dog.github.io/cogs-client-lib/)

## Add to your project

### Browser

```html
<script src="https://unpkg.com/@clockworkdog/cogs-client@0"></script>
```

### NPM

```shell
npm install --save @clockworkdog/cogs-client
```

### Yarn

```shell
yarn add @clockworkdog/cogs-client
```

## Usage

### Import the library

#### Browser

```js
const { CogsConnection, CogsAudioPlayer } = COGS;
```

#### Javascript

```js
const { CogsConnection, CogsAudioPlayer } = require('@clockworkdog/cogs-client');
```

#### Typesript / ES6

```ts
import { CogsConnection, CogsAudioPlayer } from '@clockworkdog/cogs-client';
```

### Connect to COGS

```ts
let connected = false;

const cogsConnection = new CogsConnection();
cogsConnection.addEventListener('open', () => {
  connected = true;
});
cogsConnection.addEventListener('close', () => {
  connected = false;
});
cogsConnection.addEventListener('config', (event) => {
  const config = event.detail;
  // Handle new config.
  // `config` is of type `{ [configKey: string]: number | string | boolean }`
});
cogsConnection.addEventListener('updates', (event) => {
  const updates = event.detail;
  // Handle input port updates.
  // `updates` is of type `{ [portName: string]: number | string | boolean }`
});
cogsConnection.addEventListener('event', (event) => {
  const { key, value } = event.detail;
  // Handle event. See 'types/Callback.ts`
  // `key` is the event name.
  // `value` is the type defined in COGS, one of `number | string | boolean | undefined`
});
cogsConnection.addEventListener('message', (event) => {
  const message = event.detail;
  // Handle message. See `types/CogsClientMessage.ts`
});

function sendEventToCogs() {
  cogsConnection.sendEvent('Hello');
}

function sendPortUpdateToCogs() {
  cogsConnection.setOutputPortValues({ port1: 100 });
}

const audioPlayer = new CogsAudioPlayer(cogsConnection);
audioPlayer.addEventListener('state', (audioState) => {
  // Handle audio state. See `types/AudioState.ts`
});
```

### Local development

When developing locally you should connect to COGS in "simulator" mode by appending `?simulator=true&t=media_master&name=MEDIA_MASTER_NAME` to the URL. Replace `MEDIA_MASTER_NAME` with the name of the Media Master you set in COGS.

For example, with your custom content hosted on port 3000, http://localhost:3000?simulator=true&t=media_master&name=Timer+screen will connect as the simulator for `Timer screen`.

## Release process

1. Create a new commit with a bumped version number in `package.json`.
2. [Click here to create a new release on GitHub](https://github.com/clockwork-dog/cogs-client-lib/releases/new) where the Tag Version is the version from `package.json` prefixed with a `v`.

The release will be automatically built and released on npm.
