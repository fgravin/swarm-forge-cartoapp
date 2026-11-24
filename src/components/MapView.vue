<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { createMaplibreMap } from '../adapters/maplibreMap'
import type { MapScreen } from '../application/useMapScreen'
import BasemapPanel from './BasemapPanel.vue'
import BboxPanel from './BboxPanel.vue'
import LayerPanel from './LayerPanel.vue'

const { screen } = defineProps<{ screen: MapScreen }>()
const container = useTemplateRef<HTMLDivElement>('container')
const { description } = screen.mapView
const { groups, select } = screen.basemaps
const { drawingMode, bboxText, canClear, toggleDrawing, clearBbox } = screen.bboxCapture
const layers = screen.layers
const { items } = layers

onMounted(() => {
  if (container.value) screen.connect(createMaplibreMap(container.value, screen.mapView.view.value))
})
onBeforeUnmount(() => {
  screen.disconnect()
})
</script>

<template>
  <section class="relative h-full w-full">
    <div ref="container" class="h-full w-full" data-testid="map" />
    <div class="absolute left-2 top-2 flex flex-col items-start gap-2">
      <BasemapPanel :groups="groups" @select="select" />
      <BboxPanel
        :drawing-mode="drawingMode"
        :bbox-text="bboxText"
        :can-clear="canClear"
        @toggle-drawing="toggleDrawing"
        @clear="clearBbox"
      />
    </div>
    <!-- Under the zoom buttons and above the credits; the panel scrolls when it is taller than the room left. -->
    <div class="pointer-events-none absolute bottom-12 right-2 top-28 flex flex-col items-end">
      <LayerPanel
        class="pointer-events-auto max-h-full overflow-y-auto"
        :items="items"
        @toggle-shown="layers.toggleShown"
        @zoom-to="layers.zoomTo"
        @set-opacity="layers.setOpacity"
        @toggle-legend="layers.toggleLegend"
        @legend-failed="layers.legendFailed"
      />
    </div>
    <output
      class="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 font-mono text-xs text-slate-800 shadow"
      data-testid="map-view"
    >
      {{ description }}
    </output>
  </section>
</template>
