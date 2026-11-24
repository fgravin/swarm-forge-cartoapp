import type { JsonAnswer } from '../domain/geonames'

/** What the application needs to ask a web service. */
export interface JsonSource {
  /** GETs `url` and reads its JSON body. Never rejects: what goes wrong is a `failed` answer. */
  getJson(url: string): Promise<JsonAnswer>
}

/** What the application needs to act once some time has passed. */
export interface Timer {
  /** Calls `action` once, `milliseconds` from now. Returns the function that cancels it. */
  after(milliseconds: number, action: () => void): () => void
}
