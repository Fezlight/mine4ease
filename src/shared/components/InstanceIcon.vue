<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>

<template>
  <span class="group flex flex-col relative h-[54px] w-[54px] drop-shadow-2xl">
    <button type="button" class="flex items-center focus:outline-0 justify-center rounded-full h-[54px] w-[54px] overflow-hidden group-hover:rounded-2xl group-hover:scale-110 duration-300 hover:duration-200 group-[.active]:scale-110 group-[.active]:rounded-2xl"
            :class="customClass">
      <slot></slot>
    </button>
  </span>
</template>
