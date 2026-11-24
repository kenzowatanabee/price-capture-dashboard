# Price Capture Dashboard

A Domo custom app for the prices collected by [price-capture](https://github.com/kenzowatanabee/price-capture): the latest run at a glance, a store × SKU price matrix, and each SKU's price over time.

## Screens

- **Header:** a headline that names the cheapest store of the latest run, when that run happened (Brasília time), and a warning when no new run has arrived for more than 30 hours.
  - The font (Inter) is bundled with the app, so it needs no external font service inside Domo.
- **Product filters:** one dropdown per segmentation field (category, sub-category, supplier, brand, sub-brand, segment, subsegment), shown on every tab. A choice narrows all tabs at once. Each dropdown only offers values that still lead to products, with the number of products beside it.
  - The segmentation comes from a second dataset (`fct_drugs_price_snapshots` in the manifest). If it cannot be loaded, the app still works and says the filters are unavailable.
- **Products:** one card per product with its picture, segmentation, lowest price and where, how many stores sell it themselves, and the price gap. Search, sort, and click a card to open its history.
- **Overview:**
  - Tiles for the share of checks with a price, the share that can actually be bought (VTEX cart check), the SKU × store grid and errors.
  - **Price position:** each store's average premium over the cheapest purchasable offer of the same SKU, cheapest store first, with how often it is the cheapest and how much of it is on promotion.
  - **Coverage:** SKUs with a price per store, plus the main reasons a price is missing (Not listed, Out of stock, ...).
- **Price matrix:** each SKU's latest price at every store, store columns in the same cheapest-first order.
  - All store columns share the width equally, so every store fits on one screen. Prices are in R$, stated once in the legend.
  - Every price shows its premium over the lowest ("+13.3%"), and the cell tint gets darker as the premium grows. The lowest is marked "▼ Lowest".
  - A badge shows the discount against the store's own list price.
  - A price that cannot be bought is struck through, and is left out of the lowest price and the price gap.
  - A product that a store only sells through a marketplace partner (`seller_type = partner`) shows "Partner only" with no price, because that is not the store's own price. The partner and its price are in the price history tab.
  - **Export CSV** downloads what is on screen, one line per store and SKU. The file uses `;` as the separator and a decimal comma, so it opens directly in Brazilian Excel.
  - Search by words in any order or by EAN (accents ignored, e.g. `total 90g`), sort by the biggest price gap, and click a SKU to open its history.
  - Every price is a link to that store's own product page, so it can be checked at the source. Missing prices (e.g. out of stock) link too when the store has a page for the product.
  - Each SKU shows a product picture, loaded from the store's own site (`image_url`). When a store sent none, or it fails to load, a neutral tile takes its place. Hover a picture for a large preview.
- **Price history:** one step line per store, one point per day (the last price of that day).
  - A product header shows the picture, the lowest price of the latest run and a link to that store's page. Its search box finds another product by name or EAN.
  - Up to 3 stores are highlighted in colour and the rest stay grey. Click a store in the side list to swap.
  - Hover for every store's price on that day, or switch to the table view.
  - The side list shows each store's latest, lowest and highest price, with a link to the store's product page.
  - **Sellers in the latest run** lists who sells the product on each store's site (the store itself or a partner, tagged), with price, list price, whether it can be bought, and a link to the page. A store with several sellers for the product gets one line per seller.
  - **Export this product's history** downloads every recorded row for the product.

## Data

The dataset can hold several rows per store and product in one run: the main row, plus one per other seller on the store's site (`main_offer = false`). The app compares and counts main rows only; the other rows feed the sellers table.

The app reads the `PRICE_TRACKER` dataset (`664c99b0-c76b-4800-b46e-b36de6e7bc71`) through Domo's SQL API, under the alias `prices` declared in `public/manifest.json`. If the dataset is ever replaced, update `dataSetId` there.

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
