<script setup lang="ts">
import type { BasemapGroup } from '../application/useBasemaps'
import type { BasemapId } from '../domain/basemaps'

defineProps<{ groups: readonly BasemapGroup[] }>()
const emit = defineEmits<{ select: [id: BasemapId] }>()
</script>

<template>
  <fieldset class="rounded bg-white/95 px-3 py-2 text-sm text-slate-800 shadow">
    <legend class="float-left mb-1 font-semibold text-slate-900">Fonds de plan</legend>
    <fieldset v-for="group in groups" :key="group.provider" class="clear-left mt-1">
      <legend class="px-1 text-xs font-medium text-slate-500">{{ group.provider }}</legend>
      <label
        v-for="option in group.options"
        :key="option.id"
        class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-100 has-checked:bg-sky-100 has-checked:font-semibold has-checked:text-sky-900"
      >
        <input
          type="radio"
          name="basemap"
          :value="option.id"
          :checked="option.selected"
          class="accent-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          @change="emit('select', option.id)"
        />
        {{ option.name }}
      </label>
    </fieldset>
  </fieldset>
</template>
