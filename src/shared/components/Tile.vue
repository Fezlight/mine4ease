<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  buttonTitle: string
}>();

const emit = defineEmits<{
  (e: 'action'): void
}>();

</script>

<template>
  <div class="flex flex-col gap-2 bg-black/30 border border-gray-700/30 rounded-lg shadow p-4">
    <h5 class="text-xl tracking-tight text-white">{{ title }}</h5>
    <p class="text-sm font-light tracking-wide text-white opacity-40">{{ subtitle }}</p>
    <button type="button"
            @click="emit('action')"
            class="mt-6 border focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center border-gray-600 text-gray-400 hover:text-white hover:bg-gray-600 focus:ring-gray-800">{{ buttonTitle }}</button>
  </div>
</template>
