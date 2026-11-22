<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { createMaplibreMap } from '../adapters/maplibreMap'
import { useMapView } from '../application/useMapView'

const container = useTemplateRef<HTMLDivElement>('container')
const { view, description, connect, disconnect } = useMapView()

onMounted(() => {
  if (container.value) {
    connect(createMaplibreMap(container.value, view.value))
  }
})
onBeforeUnmount(disconnect)
</script>

<template>
  <section class="relative h-full w-full">
    <div ref="container" class="h-full w-full" data-testid="map" />
    <output
      class="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 font-mono text-xs text-slate-800 shadow"
      data-testid="map-view"
    >
      {{ description }}
    </output>
  </section>
</template>
