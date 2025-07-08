import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Plugin, ResolvedConfig } from 'vite';

const PLUGIN_NAME = 'cogs';

const devModeIndexHtmlContent = (serverUrl: string) => {
  const serverUrlNoTrailingSlash = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

  return `<html>
  <head>
    <title>Redirecting...</title>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const parsedUrl = new URL(document.location.href);
        const pathParams = new URLSearchParams(parsedUrl.searchParams);
        document.location.href = \`${serverUrlNoTrailingSlash}\${parsedUrl.pathname}?\${pathParams.toString()}\`;
      });
    </script>
  </head>
  <body></body>
</html>`;
};

const INDEX_HTML_POLYFILL = `  <!-- COGS SDK Polyfill for global -->
<script>
if (global === undefined) {
var global = window;
}
if (module === undefined) {
var module = {};
}
</script>
</head>`;

export interface CogsPluginOptions {
  /**
   * Set a custom path to the COGS plugin manifest file
   */
  manifestFilePath?: string;

  /**
   * Set the `true` to not expose the dev server on all networks and only allow connections over `localhost`
   */
  noServerExpose?: boolean;
}

export const cogsPlugin = (options: CogsPluginOptions = {}): Plugin => {
  let config: ResolvedConfig;
  let serverUrl: string;
  let manifestFilename: string, manifestFilePath: string;

  // Get the path to the manifest file, throwing an error if the file does not exist
  const basePath = process.cwd();
  if (options.manifestFilePath) {
    manifestFilename = basename(options.manifestFilePath);
    manifestFilePath = resolve(basePath, options.manifestFilePath);
  } else {
    manifestFilename = 'cogs-plugin-manifest.js';
    manifestFilePath = join(basePath, 'src', manifestFilename);
  }

  // Check if the manifest file exists
  if (!existsSync(manifestFilePath)) {
    throw new Error(`COGS Manifest file not found at ${manifestFilePath}`);
  }

  /**
   * The function will create the the structure needed in `outDir` to run the project through COGS in dev mode
   */
  const generateDevModeOutput = async () => {
    // Remove and recreate the outDir
    const outDirPath = join(basePath, config.build.outDir);
    await rm(outDirPath, { force: true, recursive: true });
    await mkdir(outDirPath);

    // Copy the manifest file into it
    await cp(manifestFilePath, join(outDirPath, manifestFilename));

    // Copy the contents of the public dir into the root of the outDir
    await cp(join(basePath, 'public'), outDirPath, { recursive: true });

    // Create an index.html file in the root of the outDir
    const indexHtmlContent = devModeIndexHtmlContent(serverUrl);
    await writeFile(join(outDirPath, 'index.html'), indexHtmlContent);
  };

  return {
    name: PLUGIN_NAME,

    /**
     * Make sure the server is exposed to all the network so it "just works" in dev mode
     */
    config() {
      if (options.noServerExpose) {
        return {};
      } else {
        return { server: { host: '0.0.0.0' } };
      }
    },

    /**
     * Store the resolved config so we can access it elsewhere in the plugin code
     */
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    /**
     * When the server is configured we add a listener to get the real port value. This is because it might not match the one in the config if
     * that one was not available
     */
    configureServer(server) {
      // We wait for the server to be listening and then capture the port. This is needed because the port we actually listen to might
      // be different from the one in the Vite config
      server.httpServer?.on('listening', () => {
        // We need to wait for the other listeners to finish before we can access the resolved URLs from Vite
        setImmediate(() => {
          if (server.resolvedUrls?.network && server.resolvedUrls.network.length > 0) {
            serverUrl = server.resolvedUrls.network[0];
          } else if (server.resolvedUrls?.local && server.resolvedUrls.local.length > 0) {
            serverUrl = server.resolvedUrls.local[0];
          } else {
            const address = server.httpServer?.address();
            if (address && typeof address === 'object') {
              serverUrl = `http://localhost:${address.port}/`;
            }
          }
          generateDevModeOutput();
        });
      });
    },

    /**
     * When the build starts we detect if we're in "serve" mode (dev mode) and start a dev build output
     */
    async buildStart() {
      if (config.command === 'serve') {
        // Started in dev mode. We are going to make the outDir be something which when accessed by COGS will link to the dev server
        // Store the port we're configed to use
        serverUrl = `http://localhost:${config.server.port}/`;
        // Add the manifest file to the list of files we are watching
        this.addWatchFile(manifestFilePath);
        // Create the server output
        await generateDevModeOutput();
      }
    },

    /**
     * When the manifest file changes in dev mode, we need to rebuild the output.
     * This is only used in build mode.
     */
    async watchChange(path) {
      if (path === manifestFilePath) {
        await generateDevModeOutput();
      }
    },

    /**
     * We tell Vite to include the manifest file in the build output as an asset.
     * This is only called in "build" mode when we're bundling for production
     */
    async generateBundle() {
      const source = await readFile(manifestFilePath);
      this.emitFile({
        fileName: manifestFilename,
        source,
        type: 'asset',
      });
    },

    /**
     * We need to add a polyfill for `global` and `module` in the HTML file for the COGS SDK to correctly load
     * It is used in both build and serve mode
     */
    transformIndexHtml(html) {
      return html.replace(/<\/head>/, INDEX_HTML_POLYFILL);
    },
  };
};
