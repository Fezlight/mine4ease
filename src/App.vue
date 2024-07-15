<template>
  <div class="flex flex-col min-h-screen">
    <header class="sticky top-0 z-10 px-2 bg-gray-800 h-[30px] draggable flex items-center border-b-[1px] border-gray-500/60">
      <img class="w-5 h-5" src="./assets/icon.png" alt="Mine4Ease Logo">
      <span class="text-left mx-1 text-[16px] font-bold text-gray-400">Mine4Ease</span>
    </header>
    <router-view class="flex-grow"></router-view>
  </div>
</template>
