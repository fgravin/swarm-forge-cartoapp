import type { StepHandler } from '../runtime'
import { APPLICATION_STEPS } from './applicationSteps'
import { BASEMAP_STEPS } from './basemapSteps'
import { BBOX_STEPS } from './bboxSteps'
import { GEONAMES_STEPS } from './geonamesSteps'
import { LAYER_STEPS } from './layerSteps'
import { PLACE_SEARCH_STEPS } from './placeSearchSteps'
import { answeringFirst, WMS_SERVER_STEPS } from './wmsServerSteps'
import type { World } from './world'

export { createWorld, type World } from './world'

export const STEP_HANDLERS: readonly StepHandler<World>[] = [
  ...answeringFirst([
    ...APPLICATION_STEPS,
    ...BASEMAP_STEPS,
    ...BBOX_STEPS,
    ...GEONAMES_STEPS,
    ...PLACE_SEARCH_STEPS,
    ...LAYER_STEPS,
  ]),
  ...WMS_SERVER_STEPS,
]
