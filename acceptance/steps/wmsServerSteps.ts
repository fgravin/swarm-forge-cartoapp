import type { DeclaredLayer } from '../../src/domain/wmsLayers'
import { step, type StepHandler } from '../runtime'
import { parseBbox } from './values'
import type { World } from './world'

/** What "the server declares the layer <name> with the <part> <value>" changes in the declaration. */
function declaredPart(part: string, value: string): Partial<DeclaredLayer> {
  switch (part) {
    case 'title':
      return { title: value }
    case 'credit':
      return { credit: value }
    case 'legend':
      return { legendUrl: value }
    case 'extent':
      return { extent: parseBbox(value, 'extent') }
    default:
      throw new Error(`a server declares no "${part}" for a layer`)
  }
}

/**
 * What the WMS servers declare and how they answer. These steps run before the
 * servers answer the requests they hold: see `answeringFirst`.
 */
export const WMS_SERVER_STEPS: readonly StepHandler<World>[] = [
  step(/^the server declares the layer (\S+) with the (title|credit|legend|extent) (.+)$/, ({ wms }, [name = '', part = '', value = '']) => {
    wms.declare(name, declaredPart(part, value))
  }),

  step(/^the server declares the layer (\S+) with no (legend|extent)$/, ({ wms }, [name = '', part = '']) => {
    wms.declare(name, part === 'legend' ? { legendUrl: undefined } : { extent: undefined })
  }),

  step(/^the server of (\S+) announces its GetMap service at (\S+)$/, ({ wms }, [name = '', url = '']) => {
    wms.declare(name, { getMapUrl: url })
  }),

  step(/^the server of (\S+) (?:cannot be reached|answers with an error|does not declare it)$/, ({ wms }, [name = '']) => {
    wms.fail(name)
  }),

  step(/^the server of (\S+) (?:has not answered yet|never answers)$/, ({ wms }, [name = '']) => {
    wms.hold(name)
  }),

  step(/^no server has answered yet$/, ({ wms }) => {
    wms.holdAll()
  }),
]

/**
 * Lets the WMS servers answer the requests they hold before each step that is
 * not one of `WMS_SERVER_STEPS`. The application asks the servers as soon as
 * it starts, in the Background; the steps that say what a server declares
 * come after it, and take effect when the server answers.
 */
export function answeringFirst(handlers: readonly StepHandler<World>[]): readonly StepHandler<World>[] {
  return handlers.map(({ pattern, run }) =>
    step(pattern, async (world: World, captures) => {
      await world.wms.answer()
      await run(world, captures)
    }),
  )
}
