import type { StepHandler } from '../runtime'
import { APPLICATION_STEPS } from './applicationSteps'
import { BASEMAP_STEPS } from './basemapSteps'
import type { World } from './world'

export { createWorld, type World } from './world'

export const STEP_HANDLERS: readonly StepHandler<World>[] = [...APPLICATION_STEPS, ...BASEMAP_STEPS]
