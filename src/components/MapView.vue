<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { createMaplibreMap } from '../adapters/maplibreMap'
import { useMapScreen } from '../application/useMapScreen'
import BasemapPanel from './BasemapPanel.vue'

const container = useTemplateRef<HTMLDivElement>('container')
const screen = useMapScreen()
const { description, groups, select } = screen

onMounted(() => {
  if (container.value) screen.connect(createMaplibreMap(container.value, screen.view.value))
})
onBeforeUnmount(() => {
  screen.disconnect()
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
