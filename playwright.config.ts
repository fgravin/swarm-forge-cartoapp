import { defineConfig, devices } from '@playwright/test'

// End-to-end QA suite: `npm run e2e`. It drives the built application through
// the browser only. QA owns `qa/e2e`.
const port = Number(process.env.E2E_PORT ?? 4173)

export default defineConfig({
  testDir: 'qa/e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
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
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
