<script setup lang="ts">
import {computed} from "vue";

const emit = defineEmits<(e: 'backToLastPage') => void>();

const props = defineProps<{
  maxSizeClass?: string
}>();

const mutateSize = computed(() => props.maxSizeClass ?? 'max-w-xl');
</script>
<template>
  <div class="sticky left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 rounded-full bottom-4" :class="mutateSize">
    <div class="grid grid-flow-col h-full font-medium [&>*]:rounded-none [&>*:first-child]:rounded-s-full [&>*:last-child]:rounded-r-full">
      <button @click="emit('backToLastPage')" type="button" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-700 group py-1">
        <font-awesome-icon :icon="['fas', 'arrow-left']" class="text-gray-500 group-hover:text-white" size="2xl" />
        <span class="text-sm text-gray-400 ring-gray-700 group-hover:text-white">Back</span>
      </button>
      <slot></slot>
    </div>
  </div>
</template>
