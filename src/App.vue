<script setup lang="ts">
import { browserTimer } from './adapters/browserTimer'
import { fetchJson } from './adapters/fetchJson'
import { geonamesPlaceFinder } from './application/geonamesPlaceFinder'
import { useMapScreen } from './application/useMapScreen'
import MapView from './components/MapView.vue'
import PlaceSearch from './components/PlaceSearch.vue'

const screen = useMapScreen({
  finder: geonamesPlaceFinder(import.meta.env.VITE_GEONAMES_USERNAME, fetchJson),
  timer: browserTimer,
})
const search = screen.placeSearch
const { text, expanded, options, activeOptionId, message, canClear } = search
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Above the map, so that the suggestion list opens over it and its panels. -->
    <header class="relative z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <h1 class="shrink-0 text-base font-semibold text-slate-900">Carto App</h1>
      <PlaceSearch
        :text="text"
        :disabled="search.disabled"
        :hint="search.hint"
        :expanded="expanded"
        :options="options"
        :active-option-id="activeOptionId"
        :message="message"
        :can-clear="canClear"
        @type="search.type"
        @next="search.next"
        @previous="search.previous"
        @choose-active="search.chooseActive"
        @choose="search.choose"
        @close="search.close"
        @clear="search.clear"
      />
    </header>
    <main class="min-h-0 flex-1">
      <MapView :screen="screen" />
    </main>
  </div>
</template>
