import type { StepHandler } from '../runtime'
import type { World } from './world'

export { createWorld, type World } from './world'

export const STEP_HANDLERS: readonly StepHandler<World>[] = []
