<script setup lang="ts">
defineProps<{
  fluid?: boolean
}>();
</script>
<template>
  <section class="flex flex-col bg-gray-800 grow max-window-height overflow-y-auto" :class="fluid ? '' : 'p-6'">
    <slot></slot>
  </section>
</template>
