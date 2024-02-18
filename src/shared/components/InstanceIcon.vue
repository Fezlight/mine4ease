<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>

<template>
  <div class="group flex flex-row relative drop-shadow-2xl gap-2.5">
    <span class="h-1/2 my-auto border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl hidden group-[.active]:hidden group-hover:block"></span>
    <span class="border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl invisible group-hover:hidden group-[.active]:visible group-[.active]:block"></span>
    <button type="button" class="flex items-center focus:outline-0 justify-center rounded-full h-[54px] w-[54px] overflow-hidden group-hover:rounded-2xl group-hover:scale-110 duration-300 hover:duration-200 group-[.active]:scale-110 group-[.active]:rounded-2xl"
            :class="customClass">
      <slot></slot>
    </button>
  </div>
</template>
