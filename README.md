# Price Capture Dashboard

A Domo custom app for the prices collected by [price-capture](https://github.com/kenzowatanabee/price-capture): the latest run at a glance, a store × SKU price matrix, and each SKU's price over time.

## Screens

- **Overview:** the latest run's share of SKUs with a price, the share that can actually be bought (VTEX cart check), errors, and per-store health with the main reasons a price is missing (`NOT_LISTED`, `OUT_OF_STOCK`, ...).
- **Price matrix:** each SKU's latest price at every store.
  - The cheapest store is highlighted, and a badge shows the discount against the store's own list price.
  - A price that cannot be bought is struck through, and is left out of the cheapest store, the min/max and the spread.
  - Click a SKU to open its history.
- **Price history:** one line per store, one point per day (the last price of that day), plus each store's latest, lowest and highest price.

## Data

The app reads the `PRICE_TRACKER` dataset (`4f8c2a91-7d3e-4b6a-9c51-2e8f0a6d3b74`) through Domo's SQL API, under the alias `prices` declared in `public/manifest.json`. If the dataset is ever replaced, update `dataSetId` there.

- The latest run is the most recent `run_id`. Older rows without a `run_id` still appear in the history.
- Domo returns every value as text. `src/services/prices.ts` turns the rows into typed values.
- Queries are filtered in Domo: the app never downloads the whole dataset.

## Development

```bash
pnpm install
domo login                 # ryuu CLI, once per Domo instance
pnpm start                 # dev server, proxies data calls to your Domo instance
pnpm test                  # unit and component tests (a fake Domo, no network)
pnpm storybook             # every screen with sample data, no Domo needed
pnpm upload                # build and publish to Domo
```

`pnpm start` and `pnpm upload` need Domo's global CLIs (`@domoinc/da` and `ryuu`), as described in the template notes below.

Code layout: `services/` (Domo queries), `utils/insights.ts` (matrix, overview and history logic), `reducers/prices/` (state), `components/` (screens), and `fixtures/` (sample data for tests and stories).

---

> ### This project was bootstrapped with [Vite](https://vitejs.dev/).

# DomoApps Advanced App Platform Template

## Overview

Vite Template optimized for building advanced DomoApps.

* [Usage](#usage)
* [Running project (local dev)](#running-project-local-dev)
* [Building and uploading](#building-and-uploading)
* [Login and proxy](#login-and-proxy)
  + [Login](#login)
  + [Dev-server proxy](#dev-server-proxy)
* [Available Scripts](#available-scripts)
  + [`pnpm generate`](#pnpm-generate)
      - [*Components*](#components)
      - [*Reducers*](#reducers)
  + [`pnpm start`](#pnpm-start)
  + [`pnpm test`](#pnpm-test)
  + [`pnpm build`](#pnpm-build)
  + [`pnpm storybook`](#pnpm-storybook)
* [git hooks](#git-hooks)
* [Additional notes](#additional-notes)

## Usage

The easiest way to use this template is to run the `da` cli command found in [@domoinc/da](https://www.npmjs.com/package/@domoinc/da). Please follow the installation instructions there and use the `da new my-app-name` command to create a new project.

* Note: you can also manually clone this repository, or use a tool like [degit](https://www.npmjs.com/package/degit) to scaffold a project using this template. _However_, you would have to manually replace the placeholders in the template (e.g. app name, package manager, etc).

## Running project (local dev)

Once your template is set up and ready, use the `start` script to run the local server. e.g:

`pnpm start`

By default, the build tool will attempt to run the server on port 3000, 3001, or 3002 (in that order). If all these ports are busy, a random available port will be used.

## Building and uploading

The project can be built using the `build` script. But an `upload` script is also provided, which will prepare and build the project, and upload it to your Domo instance.

* Note: make sure to [log into](#login-and-proxy) your Domo instance before attempting to upload your project.

## Login and proxy

In order to send requests to your Domo instance from within your app while running a local server, or to upload your project to your instance, you must first log into it.


### Login

Use the ["ryuu" cli](https://www.npmjs.com/package/ryuu) to login to your Domo instance: `domo login`.

### Dev-server proxy

Before using endpoints in your instance, you must login and upload your project at least once. This is required to obtain a proxy id to provide to the local server's proxy. Follow these steps:

1. [Log into](#login) your instance
2. Upload your base app to your Domo instance using the `upload` script (e.g. `pnpm upload`). The project will build, add all assets to the `build` folder, and then upload those assets to Domo.
3. The `manifest.json` file in the `build` folder will be modified by the domoapps cli to include an `id` property. You will want to copy this `id` into the manifest in your `public` folder so that it doesn't continue to create a new `id` (and therefore, a new asset) on each upload. This is your new asset's id.
4. On your Domo instance, navigate to your Asset Library, locate the newly create asset, and create a new card for it.
5. Back in your project, add a `proxyId` property to the `manifest.json` file in your `public` folder (or `src/manifestOverrides`) using the id of the newly created card. See [this documentation](https://www.npmjs.com/package/@domoinc/ryuu-proxy#user-content-getting-a-proxyid-advanced) for more information on obtaining the proxy id.

## Available Scripts

The following scripts are provided in the base template. The examples in this section use `pnpm`, but you can use your favorite package manager to run them (e.g. `pnpm`, `npm run`, `yarn`)

### `pnpm generate`

The command `pnpm generate` will generate a new component or reducer slice, and add it to your project (or the [`da` cli]([@domoinc/da](https://www.npmjs.com/package/@domoinc/da#da-generate-template)), if installed globally)

#### *Components*

The new component will be added in the `src/components` folder. The storybook and test files (if selected) will be included in the same folder.

#### *Reducers*

Generating a slice will produce the following modifications to your project:

1. A new folder will be created in the `/src/reducers` directory of your project and a `slice.ts` file will be added to it with some boiler plate examples for actions and selectors using Redux Toolkit.
More info can be found in the Redux Toolkit [documentation](https://redux-toolkit.js.org/api/createSlice).
2. The `index.ts` file in the base of the reducer folder will be modified to import your new slice and wire it up.
_As long as you always create slices using the generator command, you should never need to touch this file._

### `pnpm start`

Runs the app in the development mode.
Open [localhost:3000](http://localhost:3000) to view it in the browser.

The page will hot reload as you make edits and save files.
Linting errors will be logged in the console.

### `pnpm build`

Builds the app for production to the `build` folder.

Prettier is used in the project to auto-format your code, and eslint is used to maintain code rules. Both scripts are run before every build, along with any unit tests present.

### `pnpm test`

Launches the test runner in watch mode.
See the section about [writing tests](https://vitest.dev/guide/#writing-tests) for more information.

### `pnpm storybook`

Starts up a storybook server to host any components that have been generated with a storybook file.

More on how to set up stories at: https://storybook.js.org/docs/writing-stories#defining-stories

## git hooks

Husky is used to provide access to git hooks. The `prepare` script runs automatically the first time the project is set up via a package manager.

Husky and lint-staged are used to run scripts during certain stages of git commits. For example, running `git commit` will trigger a `pre-commit` and a `post-commit`.

You can disable husky by removing the `.husky` folder from your project and the `hooksPath` property from your `.git/config` file. After that, you can remove the `husky` and `lint-staged` packages from your project, as well as the `prepare` script and `lint-staged` properties from `package.json`.

## Additional notes

- The base manifest and thumbnail files are provided in the `public` folder.
- To add a new entry for specific manifest overrides use `da` (`da manifest my-instance "This is my instance override"` )
- The proxy server is set up with [@domoinc/ryuu-proxy](https://www.npmjs.com/package/@domoinc/ryuu-proxy) for local development to your domo instance.
