/** The credits the map shows: the basemap's, then those of the shown layers, in the order of the list. */
export function describeCredits(basemapCredit: string, layerCredits: readonly string[]): string {
  return [basemapCredit, ...layerCredits].join(', ')
}
