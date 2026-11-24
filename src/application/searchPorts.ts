import type { JsonAnswer } from '../domain/jsonAnswer'
import type { SearchAnswer } from '../domain/suggestions'

/** What the place search needs to find the places and addresses a text names. */
export interface PlaceFinder {
  /** What `text` names. Never rejects: a search that cannot be answered is an `unavailable` answer. */
  find(text: string): Promise<SearchAnswer>
}

/** What the application needs to ask a web service. */
export interface JsonSource {
  /** GETs `url` and reads its JSON body. Never rejects: what goes wrong is a `failed` answer. */
  getJson(url: string): Promise<JsonAnswer>
}
