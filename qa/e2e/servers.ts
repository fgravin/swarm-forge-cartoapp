// The builds of the application the QA suite serves, one per value of the
// GeoNames username (place-search-configuration.md). `playwright.config.ts`
// builds and serves each one on its own port, from `E2E_PORT` (4173) up.

const FIRST_PORT = Number(process.env.E2E_PORT ?? 4173)

/** A build of the application, served at `url`. */
export interface ServedBuild {
  readonly port: number
  readonly url: string
  /** `VITE_GEONAMES_USERNAME` when the application was built: undefined when unset. */
  readonly username: string | undefined
}

function servedBuild(offset: number, username: string | undefined): ServedBuild {
  const port = FIRST_PORT + offset
  return { port, url: `http://127.0.0.1:${port}`, username }
}

/** The build every procedure opens unless it says otherwise, with the made-up username `carto-qa`. */
export const CONFIGURED = servedBuild(0, 'carto-qa')
/** Built with `VITE_GEONAMES_USERNAME` unset. */
export const USERNAME_UNSET = servedBuild(1, undefined)
/** Built with `VITE_GEONAMES_USERNAME` set to the empty string. */
export const USERNAME_EMPTY = servedBuild(2, '')

export const SERVED_BUILDS: readonly ServedBuild[] = [CONFIGURED, USERNAME_UNSET, USERNAME_EMPTY]
