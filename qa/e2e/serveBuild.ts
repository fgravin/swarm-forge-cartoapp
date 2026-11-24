import { build, preview, type InlineConfig } from 'vite'

// Builds the application for production with the GeoNames username given, or
// with none, and serves it on `port`: `tsx qa/e2e/serveBuild.ts <port> [username]`.
// `playwright.config.ts` runs it once per build of `servers.ts`.
//
// The username comes from this command alone. No `.env` file is read, so the
// username a developer keeps in `.env.local` never changes what the suite sees.

const [port, username] = process.argv.slice(2)
if (port === undefined) throw new Error('Usage: tsx qa/e2e/serveBuild.ts <port> [username]')

if (username === undefined) delete process.env.VITE_GEONAMES_USERNAME
else process.env.VITE_GEONAMES_USERNAME = username

const config: InlineConfig = {
  envDir: false,
  logLevel: 'warn',
  build: { outDir: `dist/e2e-${port}`, emptyOutDir: true },
  preview: { host: '127.0.0.1', port: Number(port), strictPort: true },
}

await build(config)
const server = await preview(config)
server.printUrls()
