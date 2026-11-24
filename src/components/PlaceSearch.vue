<script setup lang="ts">
import { computed } from 'vue'

import { SUGGESTION_LIST_ID, type SuggestionOption } from '../application/usePlaceSearch'

const props = defineProps<{
  text: string
  disabled: boolean
  hint: string
  expanded: boolean
  options: readonly SuggestionOption[]
  activeOptionId: string | undefined
  message: string | undefined
  canClear: boolean
}>()
const emit = defineEmits<{
  type: [text: string]
  next: []
  previous: []
  chooseActive: []
  choose: [index: number]
  close: []
  clear: []
}>()
// The field shows the text the application holds, and hands it each change.
const field = computed({ get: () => props.text, set: (text: string) => emit('type', text) })
</script>

<template>
  <div class="relative w-full max-w-md">
    <div class="flex items-center gap-2">
      <input
        v-model="field"
        type="text"
        role="combobox"
        aria-label="Rechercher un lieu ou une adresse"
        aria-autocomplete="list"
        :aria-expanded="expanded"
        :aria-controls="SUGGESTION_LIST_ID"
        :aria-activedescendant="activeOptionId"
        :placeholder="hint"
        :disabled="disabled"
        autocomplete="off"
        spellcheck="false"
        class="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        @keydown.down.prevent="emit('next')"
        @keydown.up.prevent="emit('previous')"
        @keydown.enter.prevent="emit('chooseActive')"
        @keydown.esc.stop="emit('close')"
      />
      <button
        v-if="canClear"
        type="button"
        class="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700"
        @click="emit('clear')"
      >
        Effacer
      </button>
    </div>
    <ul
      v-show="expanded"
      :id="SUGGESTION_LIST_ID"
      role="listbox"
      aria-label="Suggestions"
      class="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white py-1 shadow-lg"
    >
      <li
        v-for="(option, index) in options"
        :id="option.id"
        :key="option.id"
        role="option"
        :aria-selected="option.active"
        class="flex cursor-pointer flex-col px-3 py-1.5 text-sm hover:bg-slate-100 aria-selected:bg-sky-100"
        @mousedown.prevent
        @click="emit('choose', index)"
      >
        <span class="font-medium text-slate-900">{{ option.name }}</span>
        <span class="flex gap-2 text-xs text-slate-600">
          <span class="font-medium">{{ option.type }}</span>
          <span v-if="option.context">{{ option.context }}</span>
        </span>
      </li>
    </ul>
    <div role="status">
      <p
        v-if="message"
        class="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>
