<script setup lang="ts">
  const emit = defineEmits<(e: 'backToLastPage') => void>();
</script>
<template>
  <button @click="emit('backToLastPage')" type="button" class="rounded-lg p-1.5 bg-transparent hover:bg-gray-800 hover:text-white ring-gray-700 text-2xl">
    <font-awesome-icon :icon="['fas', 'arrow-left']" class="flex" />
  </button>
</template>
