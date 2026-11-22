<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <h1 class="text-base font-semibold text-slate-900">Carto App</h1>
    </header>
    <main class="min-h-0 flex-1">
      <MapView />
    </main>
  </div>
</template>
