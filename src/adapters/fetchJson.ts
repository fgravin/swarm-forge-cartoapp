import type { JsonSource } from '../application/searchPorts'
import type { JsonAnswer } from '../domain/jsonAnswer'

const FAILED: JsonAnswer = { kind: 'failed' }

/**
 * Asks web services with the browser's `fetch`. No connection, an HTTP error,
 * and a body that is not JSON are all a failed answer: what the body says is
 * for the application to read.
 */
export const fetchJson: JsonSource = {
  async getJson(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) return FAILED
      const body: unknown = await response.json()
      return { kind: 'answered', body }
    } catch {
      return FAILED
    }
  },
}
