# COGS SDK Example

This repository give you a structure to put together your packages which make use of the COGS SDK. These packages might be:

- Plugins for extending the functionality of the COGS SDK.
- Media Master Custom Content for displaying content through a Media Master or on the COGS Media Master app for [Android](https://play.google.com/store/apps/details?id=dog.clockwork.mobile.av) or [iOS](https://apps.apple.com/us/app/cogs-av/id6444409185).

This repository uses [Turborepo](https://turbo.build) to manage the monorepo and also provides a way to generate new "apps" which are set up and ready to use the COGS SDK.

## Requirements

- [NodeJS](https://nodejs.org/) with the version specified in `.node-version` (use a tool such as [mise](https://mise.jdx.dev) to automatically manage NodeJS versions).
- [Yarn](https://yarnpkg.com/) installed via `corepack install`. If you don't have `corepack` installed, you can install it by running `npm install -g corepack` and then `corepack enable`.

## Getting Started

Run the following command to install all dependencies of the project:

```sh
yarn install
```

## Generating a new Media Master Custom Content or COGS Plugin

To generate a new Media Master Custom Content or COGS Plugin, run:

```sh
yarn turbo generate && yarn install
```

This will prompt you to select the type of content or plugin you want to create.

## Running the Project for Development

You can start the project in development mode by running:

```sh
yarn start
```

This will set up each of the apps in development mode with hot reloading. You can then open COGS with the `test-project-pack` and then open the Media Master simulators for any Custom Content which you have.

## Running Tests

This project has tools set up to help test and check for common errors. You can run them all with `yarn test` or individually using:

- `yarn run check-repo`: Run Sherif to check for common issues with the monorepo.
- `yarn run check-types`: Run TypeScript to check for static type issues.
- `yarn run check-lint`: Run ESLint to lint the project code to check for common issues.

The repository is also set up to check for issues before committing or pushing to avoid pushing changes with issues. Github Actions will also run the full range of tests and checks on new pull requests and changes to the `main` branch.

## Building the Project for Production

You can build all `apps` for production by running:

```sh
yarn run build
```

## Repository Structure

This project repository uses a number of tools to build and manage the project:

- [Turborepo](https://turbo.build) for monorepo management, task running, and caching.
- [TypeScript](https://www.typescriptlang.org/) for static type checking.
- [Vite](https://vite.dev) for web app building and bundling.
- [tsup](https://tsup.egoist.dev) for building the non web app packages using [esbuild](https://github.com/evanw/esbuild).
- [ESLint](https://eslint.org/) for code linting.
- [Prettier](https://prettier.io) for code formatting.
- [Sherif](https://github.com/QuiiBz/sherif) for monorepo linting to check for common issues.

Inside the monorepo there are a number of `apps` and `packages`. `apps` are the final deliverables of the project (custom content, plugins, etc). `packages` are shared libraries or utility packages which hold shared config.

In the base example project we have:

- `apps/`: This is where the custom content and plugins you create will live. See below for more details about using the generator.
- `packages/`:
  - `@repo/eslint-config`: Shared `eslint` configurations.
  - `@repo/types`: Shared typed for the project.
  - `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo.

## Github Actions

When this project is pushed to Github, Github Actions will run the full range of tests and checks on new pull requests and changes to the `main` branch.

It will also generate a zip package of the test COGS project pack along with built versions of each of the custom content and plugins you have generated.
