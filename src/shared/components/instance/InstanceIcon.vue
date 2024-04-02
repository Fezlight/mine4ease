<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>

<template>
  <div class="group flex flex-row relative drop-shadow-2xl gap-2.5">
    <slot name="pre-icon"></slot>
    <button type="button" class="flex items-center focus:outline-0 justify-center rounded-full h-[54px] w-[54px] overflow-hidden group-hover:rounded-2xl group-hover:scale-110 duration-300 hover:duration-200 group-[.active]:scale-110 group-[.active]:rounded-2xl"
            :class="customClass">
      <slot></slot>
    </button>
  </div>
</template>
