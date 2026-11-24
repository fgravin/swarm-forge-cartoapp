import { geonamesRequests, geonamesUsername, readSearchAnswer } from '../domain/geonames'
import type { JsonSource, PlaceFinder } from './searchPorts'

/**
 * Finds places and addresses with the GeoNames web services, asked through
 * `source` with the account `username`: its places search and its address
 * search, at once. Without a username, or with an empty one, there is none.
 */
export function geonamesPlaceFinder(username: string | undefined, source: JsonSource): PlaceFinder | undefined {
  const account = geonamesUsername(username)
  if (account === undefined) return undefined
  return {
    async find(text) {
      const requests = geonamesRequests(text, account)
      const [places, address] = await Promise.all([source.getJson(requests.places), source.getJson(requests.address)])
      return readSearchAnswer(places, address)
    },
  }
}
