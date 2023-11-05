<script setup lang="ts">
</script>

<template>
  <div class="group flex flex-col relative">
    <button class="flex items-center focus:outline-0 justify-center bg-sky-600/60 rounded-full p-4 h-[54px] group-hover:rounded-2xl group-hover:scale-110 duration-300 hover:duration-200 group group-[.active]:scale-110 group-[.active]:rounded-2xl">
      <slot></slot>
    </button>
  </div>
</template>
