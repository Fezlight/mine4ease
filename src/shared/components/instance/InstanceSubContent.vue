<script setup lang="ts">
defineProps<{
  fluid?: boolean
}>();
</script>
<template>
  <section class="flex flex-col bg-gray-800 flex-grow overflow-y-auto max-window-sub-content" :class="fluid ? '' : 'p-6'">
    <slot></slot>
  </section>
</template>
