import { computed, watch, type Ref } from 'vue'

import { describeCredits } from '../domain/credits'
import type { Connectable, CreditDisplay } from './mapPort'

/** Credits the basemap, then the shown layers, on the connected display, now and after each change. */
export function useCredits(
  basemapCredit: Readonly<Ref<string>>,
  layerCredits: Readonly<Ref<readonly string[]>>,
): Connectable<CreditDisplay> {
  const credits = computed(() => describeCredits(basemapCredit.value, layerCredits.value))
  let display: CreditDisplay | undefined

  // At once, so that the map credits a layer as soon as it draws it.
  watch(credits, (text) => display?.showCredits(text), { flush: 'sync' })

  return {
    connect(next) {
      display = next
      next.showCredits(credits.value)
    },
    disconnect() {
      display = undefined
    },
  }
}
