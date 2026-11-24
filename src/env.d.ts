/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The GeoNames username of the place search, read when the application is built. Set it in `.env.local`. */
  readonly VITE_GEONAMES_USERNAME?: string
}
