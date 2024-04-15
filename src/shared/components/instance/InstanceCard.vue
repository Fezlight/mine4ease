<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {InstanceSettings} from "mine4ease-ipc-api";

defineProps<{
  instance: InstanceSettings
}>()
</script>
<template>
  <div class="relative items-center inline-flex p-4 border rounded-lg shadow-md border-gray-700 hover:bg-gray-700">
    <div class="space-y-2 flex-grow">
      <h3 class="text-2xl tracking-tight text-white">{{ instance?.title }}</h3>
      <span class="inline-grid grid-cols-3 items-center gap-2">
        <span class="text-sm font-medium p-2 rounded bg-green-900 text-green-300 inline-flex items-center h-full"
              v-if="instance?.versions?.minecraft">
          <img src="../../../assets/minecraft_logo.ico" class="w-4 h-4 mr-1.5" alt="Minecraft logo" />
          <span class="text-white font-medium text-xs">{{ instance?.versions?.minecraft.name }}</span>
        </span>
        <span class="text-sm font-medium p-2 rounded bg-gray-900 text-gray-300 inline-flex items-center h-full"
              v-if="instance?.versions?.forge">
          <img src="../../../assets/forge_logo.ico" class="w-4 h-4 mr-1.5" alt="Forge logo" />
          <span class="text-white font-medium text-xs">{{ instance?.versions?.forge.name.replace('forge-', '') }}</span>
        </span>
        <span class="text-sm font-medium p-2 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full"
              v-if="instance?.versions?.fabric">
          <img src="../../../assets/fabric_logo.png" class="w-4 h-4 mr-1.5" alt="Fabric logo" />
          <span class="text-white font-medium text-xs">{{ instance?.versions?.fabric.name }}</span>
        </span>
        <span class="text-sm font-medium p-2 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full"
              v-if="instance?.versions?.quilt">
          <img src="../../../assets/quilt_logo.svg" class="w-4 h-4 mr-1.5" alt="Quilt logo" />
          <span class="text-white font-medium text-xs">{{ instance?.versions?.quilt.name }}</span>
        </span>
      </span>
      <p class="text-gray-400">{{ instance?.description }}</p>
    </div>
    <div v-if="instance?.id">
      <button class="bg-transparent rounded-full p-1.5">
        <font-awesome-icon class="text-2xl text-white" :icon="['fas', 'add']" />
      </button>
    </div>
  </div>
</template>
