<script setup lang="ts">
import { computed } from 'vue'

import { OPACITY_SLIDER, type LayerItem } from '../application/useLayers'

const props = defineProps<{ item: LayerItem }>()
const emit = defineEmits<{
  toggleShown: []
  zoomTo: []
  setOpacity: [percent: number]
  toggleLegend: []
  legendFailed: []
}>()
// The slider shows the opacity the application holds, and hands it each move.
const opacity = computed({ get: () => props.item.opacity, set: (percent: number) => emit('setOpacity', percent) })
</script>

<template>
  <li :id="item.id">
    <div role="group" :aria-label="item.title" class="flex flex-col gap-1">
      <span class="font-medium text-slate-900">{{ item.title }}</span>
      <span v-if="item.status" class="text-xs text-slate-600">{{ item.status }}</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :aria-label="item.eyeLabel"
          :aria-pressed="item.shown"
          :disabled="item.disabled"
          class="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-sky-700 aria-pressed:bg-sky-700 aria-pressed:text-white"
          @click="emit('toggleShown')"
        >
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          type="button"
          :aria-label="item.zoomLabel"
          :disabled="item.zoomDisabled"
          class="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('zoomTo')"
        >
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
          </svg>
        </button>
        <input
          v-model.number="opacity"
          type="range"
          :min="OPACITY_SLIDER.min"
          :max="OPACITY_SLIDER.max"
          :step="OPACITY_SLIDER.step"
          :aria-label="item.opacityLabel"
          :aria-valuetext="item.opacityText"
          :disabled="item.disabled"
          class="min-w-0 flex-1 accent-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span class="w-10 shrink-0 text-right text-xs tabular-nums">{{ item.opacityText }}</span>
        <button
          type="button"
          :aria-expanded="item.legendUnfolded"
          :disabled="item.disabled"
          class="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('toggleLegend')"
        >
          Légende
        </button>
      </div>
      <div v-if="item.legendUnfolded" class="mt-1">
        <img
          v-if="item.legendImage"
          :src="item.legendImage.url"
          :alt="item.legendImage.description"
          class="max-w-full"
          @error="emit('legendFailed')"
        />
        <p v-if="item.legendMessage" class="text-xs text-slate-600">{{ item.legendMessage }}</p>
      </div>
    </div>
  </li>
</template>
