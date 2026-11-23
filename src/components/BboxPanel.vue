<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ drawingMode: boolean; bboxText: string; canClear: boolean }>()
const emit = defineEmits<{ toggleDrawing: []; clear: [] }>()
const titleId = useId()
</script>

<template>
  <div class="flex flex-col items-start gap-2">
    <button
      type="button"
      :aria-pressed="drawingMode"
      class="rounded bg-white/95 px-3 py-1.5 text-sm font-medium text-slate-800 shadow hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 aria-pressed:bg-sky-700 aria-pressed:text-white aria-pressed:hover:bg-sky-800"
      @click="emit('toggleDrawing')"
    >
      Dessiner une emprise
    </button>
    <section :aria-labelledby="titleId" class="rounded bg-white/95 px-3 py-2 text-sm text-slate-800 shadow">
      <h2 :id="titleId" class="font-semibold text-slate-900">Emprise</h2>
      <output class="block font-mono text-xs">{{ bboxText }}</output>
      <button
        v-if="canClear"
        type="button"
        class="mt-2 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        @click="emit('clear')"
      >
        Effacer l'emprise
      </button>
    </section>
  </div>
</template>
