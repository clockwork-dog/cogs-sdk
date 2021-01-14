# COGS Client React library

Create content for your COGS Media Master

## Add to your project

```shell
npm install --save @clockwork-dog/cogs-client-react
```

or

```shell
yarn add @clockwork-dog/cogs-client-react
```

## Usage

Import the library

```ts
import { useCogsConnection, Video, useTimer, useAudioPlayer, useTextHint } from '@clockworkdog/cogs-client-react';
```

or

```js
const { useCogsConnection, useAudioPlayer, Video, Hint, Timer } = require('@clockworkdog/cogs-client-react');
```

then

```tsx
function MyComponent() {
  const cogsConnection = useCogsConnection();

  // Add audio playing capability (Renders nothing)
  const audioPlayer = useAudioPlayer(cogsConnection);

  return (
    <div>
      <div>Audio playing: {audioPlayer.isPlaying.toString()}</div>
      <div style={{ fontSize: 100 }}>
        {/* The time from the adjustable timer plugin in the format 'MM:SS' */}
        <Timer connection={cogsConnection} center />
      </div>
      <div style={{ fontSize: 20 }}>
        {/* The latest text hint as a string */}
        <Hint connection={cogsConnection} />
      </div>
      {/* Video overlay with the "fit" specified */}
      <Video connection={cogsConnection} fullscreen />
    </div>
  );
}
```

## Release process

1. Create a new commit with a bumped version number in `package.json`.
2. [Click here to create a new release on GitHub](https://github.com/clockwork-dog/cogs-client-react-lib/releases/new) where the Tag Version is the version from `package.json` prefixed with a `v`.

The release will be automatically built and released on npm.
