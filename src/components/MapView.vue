<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { createMaplibreMap } from '../adapters/maplibreMap'
import { useBasemaps } from '../application/useBasemaps'
import { useMapView } from '../application/useMapView'
import BasemapPanel from './BasemapPanel.vue'

const container = useTemplateRef<HTMLDivElement>('container')
const mapView = useMapView()
const basemaps = useBasemaps()
const { description } = mapView
const { groups, select } = basemaps

onMounted(() => {
  if (container.value) {
    const map = createMaplibreMap(container.value, mapView.view.value)
    mapView.connect(map)
    basemaps.connect(map)
  }
})
onBeforeUnmount(() => {
  basemaps.disconnect()
  mapView.disconnect()
})
</script>

<template>
  <section class="relative h-full w-full">
    <div ref="container" class="h-full w-full" data-testid="map" />
    <BasemapPanel class="absolute left-2 top-2" :groups="groups" @select="select" />
    <output
      class="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 font-mono text-xs text-slate-800 shadow"
      data-testid="map-view"
    >
      {{ description }}
    </output>
  </section>
</template>
