# COGS SDK - React

Use this library to create custom content for your COGS Media Master or COGS Plugin

We recommend using the [`cogs-client` Create React App template](https://github.com/clockwork-dog/cra-template-cogs-client) to get started or follow this guide to add `@clockworkdog/cogs-client-react` to your existing project.

## [Documentation](https://clockwork-dog.github.io/cogs-sdk/react/)

## Add to your project

```bash
npm install --save @clockworkdog/cogs-client-react
```

or

```bash
yarn add @clockworkdog/cogs-client-react
```

## Usage

1. Create a `cogs-plugin-manifest.js` file in the public folder of your project.

See the [CogsPluginManifestJson documentation](https://clockwork-dog.github.io/cogs-sdk/javascript/interfaces/CogsPluginManifestJson.html) for more information on the manifest format.

e.g.

```js
module.exports =
  /**
   * @type {const}
   * @satisfies {import("@clockworkdog/cogs-client").CogsPluginManifest}
   */
  ({
    name: 'My Plugin',
    description: 'My Plugin description',
    version: '1.0.0',
    // etc.
  });
```

2. Import the library

```ts
import {
  CogsConnectionProvider,
  VideoContainer,
  Timer,
  Hint,
  useIsConnected,
  useAudioPlayer,
  useIsAudioPlaying,
} from '@clockworkdog/cogs-client-react';
```

or

```js
const {
  CogsConnectionProvider,
  VideoContainer,
  Hint,
  Timer,
  useIsConnected,
  useAudioPlayer,
  useIsAudioPlaying,
} = require('@clockworkdog/cogs-client-react');
```

3. Instantiate `<CogsConnectionProvider>` with the manifest

```tsx
import * as manifest from './public/cogs-plugin-manifest.js'; // For Typescript requires `"allowJs": true` in `tsconfig.json`

function App() {
  return (
    <CogsConnectionProvider manifest={manifest} audioPlayer videoPlayer>
      <MyComponent />
    </CogsConnectionProvider>
  );
}

function MyComponent() {
  const cogsConnection = useCogsConnection<typeof manifest>();
  const isConnected = useIsConnected(cogsConnection);

  const audioPlayer = useAudioPlayer();
  const isAudioPlaying = useIsAudioPlaying(audioPlayer);

  return (
    <div>
      <div>Connected: {isConnected}</div>
      <div>Audio playing: {isAudioPlaying}</div>
      <div style={{ fontSize: 100 }}>
        {/* The time from the adjustable timer plugin in the format 'MM:SS' */}
        <Timer center />
      </div>
      <div style={{ fontSize: 20 }}>
        {/* The latest text hint as a string */}
        <Hint />
      </div>
      {/* Specify where you want the video to be displayed. Leave this out for default fullscreen behavior */}
      <VideoContainer style={{ position: 'absolute', top: 100, left: 100, width: 400, height: 300 }} />
    </div>
  );
}
```

### Local development

When developing locally you should connect to COGS in "simulator" mode by appending `?simulator=true&t=media_master&name=MEDIA_MASTER_NAME` to the URL. Replace `MEDIA_MASTER_NAME` with the name of the Media Master you set in COGS.

For example, with your custom content hosted on port 3000, http://localhost:3000?simulator=true&t=media_master&name=Timer+screen will connect as the simulator for `Timer screen`.

#### Chrome permissions

Chrome's autoplay security settings mean that you will need to interact with the page before audio or video will play. You can disable this warning when developing by pressing `ℹ️` in Chrome's URL bar, opening `Site settings`, and setting `Sound` to `Allow`.

## Using `create-react-app`

We suggest you use [our `create-react-app` template](https://www.npmjs.com/package/@clockworkdog/cra-template-cogs-client).

Or, if you're using `create-react-app` for your project, you'll need to configure the build to work with a relative path, as when accessed by a Media Master your project will not be served from the root path. This can be achieved by adding the following to your `package.json`:

```
"homepage": ".",
```
