# `vite-plugin-cogs-sdk`

A Vite plugin to easily setup your project to be a COGS plugin or custom content. It:

- In development mode creates an index.html which redirects to the Vite dev server with hot reloading to make development easier.
- In development and production mode ensures that the `src/cogs-plugin-manifest.js` file is copied into the correct location.
- Automatically set the dev server to be accessible over the network so Media Masters can access it (can be disabled with the `noServerExpose` option).

To use the plugin you need to have a file at `src/cogs-plugin-manifest.js` in CommonJS format.

## Installation

Install `vite-plugin-cogs-sdk` as a development dependency using your package manager of choice:

```bash
npm install --save-dev vite-plugin-cogs-sdk
pnpm add --save-dev vite-plugin-cogs-sdk
yarn add --dev vite-plugin-cogs-sdk
```

You can then add the plugin to your `vite.config.js` file, adding it to the `plugins` array if you already have others:

```javascript
import { defineConfig } from 'vite';
import cogsSdkPlugin from 'vite-plugin-cogs-sdk';

export default defineConfig({
  plugins: [cogsSdkPlugin()],
});
```
