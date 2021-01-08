# COGS Client React library

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
import { useCogsConnection, Video, Timer, AudioPlayer, TextHint } from '@clockworkdog/cogs-client-react';
```

or

```js
const { useCogsConnection, Video, Timer, AudioPlayer, TextHint } = require('@clockworkdog/cogs-client-react');
```

then

```tsx
function MyComponent() {
  const cogsConnection = useCogsConnection();

  // Add audio playing capability (Renders nothing)
  const audioPlayer = useAudioPlayer(cogsConnection);

  // The time from the adjustable timer plugin as a string in the format 'MM:SS'
  const timer = useTimer(cogsConnection);

  // The latest text hint as a string
  const textHint = useTextHint(cogsConnection);

  return (
    <div>
      <div>Audio playing: {audioPlayer.isPlaying}</div>
      <div style={{ fontSize: 100 }}>{timer}</div>
      {hint && <div>Hint: {hint}</div>}
      {/* Video overlay with the "fit" specified */}
      <Video style={{ zIndex: 1 }} connection={cogsConnection} fullscreen />
    </div>
  );
}
```

## Release process

1. Create a new commit with a bumped version number in `package.json`.
2. [Click here to create a new release on GitHub](https://github.com/clockwork-dog/cogs-client-react-lib/releases/new) where the Tag Version is the version from `package.json` prefixed with a `v`.

The release will be automatically built and released on npm.
