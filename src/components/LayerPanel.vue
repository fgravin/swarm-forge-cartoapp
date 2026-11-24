<script setup lang="ts">
import { useId } from 'vue'

import type { LayerItem } from '../application/useLayers'
import LayerEntry from './LayerEntry.vue'

defineProps<{ items: readonly LayerItem[] }>()
const emit = defineEmits<{
  toggleShown: [index: number]
  zoomTo: [index: number]
  setOpacity: [index: number, percent: number]
  toggleLegend: [index: number]
  legendFailed: [index: number]
}>()
const titleId = useId()
</script>

<template>
  <section :aria-labelledby="titleId" class="w-80 rounded bg-white/95 px-3 py-2 text-sm text-slate-800 shadow">
    <h2 :id="titleId" class="font-semibold text-slate-900">Couches</h2>
    <ul class="mt-2 flex flex-col gap-3">
      <LayerEntry
        v-for="(item, index) in items"
        :key="item.id"
        :item="item"
        @toggle-shown="emit('toggleShown', index)"
        @zoom-to="emit('zoomTo', index)"
        @set-opacity="(percent) => emit('setOpacity', index, percent)"
        @toggle-legend="emit('toggleLegend', index)"
        @legend-failed="emit('legendFailed', index)"
      />
    </ul>
  </section>
</template>
