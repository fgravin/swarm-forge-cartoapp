# Carto App

A map application built with TypeScript, Vue 3, MapLibre GL JS, and Tailwind CSS
on Vite. It is the test project of the SwarmForge six-pack "web stack": the
features are specified, built, and verified by six agents (see `swarmforge/`).

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Install the dependencies. |
| `npm run dev` | Serve the application for development. |
| `npm run typecheck` | Type-check everything with `vue-tsc`. |
| `npm run lint` | ESLint, including the dependency-direction rules. |
| `npm test` | Unit tests (Vitest). |
| `npm run coverage` | Unit tests with coverage, written to `coverage/lcov.info`. |
| `npm run test:property` | Property tests (fast-check). |
| `npm run acceptance` | Acceptance tests: parse `features/*.feature`, generate the entry points, run them. |
| `npm run e2e` | End-to-end QA suite (Playwright, headless). `npm run e2e:headed` shows the browser. |
| `npm run build` | Type-check and build for production. |

Node 20.19 or later is required.

## Place search

The search field of the header asks the GeoNames web services. It needs a
GeoNames username, read from the environment variable `VITE_GEONAMES_USERNAME`
when the application is built or served; without one, the field is disabled.
Create a free account at <https://www.geonames.org/login>, enable the free web
services on its account page, and give the variable your username in
`.env.local`, which git ignores. Never commit it, and do not use the public
`demo` account: its credits are exhausted.

## Layout

```text
src/domain/        product rules as plain TypeScript
src/application/   state and use cases as Vue composables, and the ports they need
src/adapters/      the only code that touches MapLibre, the network, or browser APIs
src/components/    Vue single-file components
features/          Gherkin feature files
acceptance/        acceptance pipeline (generated from the feature files)
qa/procedures/     end-to-end QA procedures
qa/e2e/            their executable form (Playwright)
.metrics/          CRAP and DRY snapshots, mutation manifests
swarmforge/        SwarmForge configuration, constitution, and role prompts
```

## Running the swarm

```sh
./swarm
```

It starts the six agents in tmux sessions and opens the dashboard. Create work
with **New Task**; approve specifications in **Attention**; stop with
**Teardown**.
