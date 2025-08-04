# COGS SDK

The COGS SDK allows you to create:

- Plugins for extending the functionality of the COGS SDK.
- Media Master Custom Content for displaying content through a Media Master or on the COGS Media Master app for [Android](https://play.google.com/store/apps/details?id=dog.clockwork.mobile.av) or [iOS](https://apps.apple.com/us/app/cogs-av/id6444409185).

We have provided a template project to get started or you can manually install and use the [JavaScript COGS SDK](./packages/javascript/README.md) or [React COGS SDK](./packages/react/README.md).

## Getting started using the template
If creating new COGS Media Master custom content or a new COGS Plugin we recommend using our [Turborepo](https://turbo.build) template.

Create a new project by running:

```bash
npx create-turbo@latest --example https://github.com/clockwork-dog/cogs-sdk/tree/main/template --package-manager yarn
```

You can then `cd` into the project and run this command to generate a new COGS Plugin or Media Master Custom Content:

```sh
yarn turbo generate && yarn install
```

When you generate these they will automatically be linked to the test COGS project pack which is included in the template.

You can read the generated `README.md` file for more details.

> [!NOTE]
> The template is configured to use Yarn 4 by default. It should be possible to use other package managers such as npm or pnpm, but you will need to manually configure these after you have created a project from the example template.

## Manual installation options

<details>
<summary><em>Manual installation options</em></summary>

### Manually with Vite

1. Create a project with Vite as usual
   e.g.
   ```
   yarn create vite my-vite-plugin --template vanilla-ts
   // OR
   yarn create vite my-vite-plugin --template react-ts
   ```
2. Add a polyfill for `global` by adding the following to `index.html`.
   ```html
   <script>
     if (global === undefined) {
       var global = window;
     }
     if (module === undefined) {
       var module = {};
     }
   </script>
   ```
3. Set `base` to `./` in `vite.config.ts` so the content can be hosted in a subfolder:
   e.g.

   ```ts
   import { defineConfig } from "vite";

   export default defineConfig({
     base: "./",
     ...
   });
   ```

4. If using Typescript, add the following options to `tsconfig.js` to support importing `cogs-plugin-manifest.js`:
   ```json
   {
     "compilerOptions": {
       "checkJs": true
     }
   }
   ```
5. Add a `cogs-plugin-manifest.js` file to the `src` folder as described above
6. Symlink `public/cogs-plugin-manifest.js` to `src/cogs-plugin-manifest.json` so that it is included in the build output:
   ```s
   # macOS / Linux
   ln -s ../src/cogs-plugin-manifest.js public/cogs-plugin-manifest.js
   # Windows
   mklink /H public\cogs-plugin-manifest.js src\cogs-plugin-manifest.js
   ```
7. If you are using React, remove `<React.StrictMode>` from your top-level component to avoid issues with multiple websockets during development.
8. Add the [COGS SDK](https://github.com/clockwork-dog/cogs-sdk/) to your project. (See [#quick-start](Quick start).)

When importing your manifest file in your source code be sure to use a wildcard import as follows:

```js
import * as manifest from './cogs-plugin-manifest.js';
```

### Create React App template (deprecated)

See https://github.com/clockwork-dog/cra-template-cogs-client

### Create React App project setup (deprecated)

1. Create a project with `create-react-app` as usual
   e.g.
   ```s
   yarn create react-app my-react-plugin --template typescript
   ```
2. Set `homepage` to `./` in `package.json` so the content can be hosted at in a subfolder:
   e.g.
   ```json
   {
     "homepage": "./",
     ...
   }
   ```
3. Add a `cogs-plugin-manifest.js` file to the `src` folder as described above
4. Symlink `public/cogs-plugin-manifest.js` to `src/cogs-plugin-manifest.json` so that it is included in the build output:
   ```s
   # macOS / Linux
   ln -s ../src/cogs-plugin-manifest.js public/cogs-plugin-manifest.js
   # Windows
   mklink /H public\cogs-plugin-manifest.js src\cogs-plugin-manifest.js
   ```
5. If you are using React, remove `<React.StrictMode>` from your top-level component to avoid issues with multiple websockets during development.
6. Add the [COGS SDK](https://github.com/clockwork-dog/cogs-sdk/) to your project. (See [#quick-start](Quick start).)

</details>

## COGS Media Master Custom Content

COGS Media Masters can display a browser window with custom HTML, Javascript and CSS, using the COGS SDK.

Some other features you can add to your custom content include:

- Play audio from your COGS project
- Display or react to COGS text hints
- Show the COGS show timer
- Connect to MIDI or WebSerial devices

### Structure of Media Master Custom Content

A folder in the `client_content` directory of a COGS Project, containing:

- A [`cogs-plugin-manifest.js` manifest file](https://clockwork-dog.github.io/cogs-sdk/javascript/interfaces/CogsPluginManifestJson.html)
- An HTML page with the content of your plugin, usually `index.html`
- Some Javascript, loaded by the HTML page, that uses the [COGS SDK](https://github.com/clockwork-dog/cogs-sdk) to communicate with COGS.

## COGS Plugins

COGS Plugins can be loaded into COGS to integrate with other systems or add specialised features to COGS.

### Structure of a COGS Plugin

A COGS plugin is a folder in the `plugins` directory of a COGS Project. The plugin directory name is the ID of the plugin (e.g. `dog.clockwork.http`) and contains:

- A [`cogs-plugin-manifest.js` manifest file](https://clockwork-dog.github.io/cogs-sdk/javascript/interfaces/CogsPluginManifestJson.html)
- An HTML page with the content of your plugin, usually `index.html`
- Some Javascript, loaded by the HTML page, that uses the [COGS SDK](https://github.com/clockwork-dog/cogs-sdk) to communicate with COGS.

## Tips

### Don't load assets over the internet

We recommend that you do not rely on loading content over the internet for maximum reliability. This means your content will load correctly and quickly even when internet connectivity at your venue is not perfect. You should include all CSS, fonts, Javascript, etc in your plugin.
