import { defineConfig, devices } from '@playwright/test'

import { CONFIGURED, SERVED_BUILDS, type ServedBuild } from './qa/e2e/servers'

// End-to-end QA suite: `npm run e2e`. It drives the built application through
// the browser only. QA owns `qa/e2e`.

/** Builds and serves `served` with its GeoNames username, or with none. */
function serveCommand({ port, username }: ServedBuild): string {
  const usernameArgument = username === undefined ? '' : ` ${JSON.stringify(username)}`
  return `npx tsx qa/e2e/serveBuild.ts ${port}${usernameArgument}`
}

export default defineConfig({
  testDir: 'qa/e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    baseURL: CONFIGURED.url,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // MapLibre needs WebGL. Headless Chromium only has it with software rendering enabled.
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: SERVED_BUILDS.map((served) => ({
    command: serveCommand(served),
    url: served.url,
    reuseExistingServer: false,
    timeout: 120_000,
  })),
})
