<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import Tile from "../../shared/components/Tile.vue";
import {InstanceService, InstanceSettings, MinecraftService} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";

const instance: Ref<InstanceSettings | undefined> = ref();

const route = useRoute();
const router = useRouter();

const $instanceService: InstanceService | undefined = inject('instanceService');
const $minecraftService: MinecraftService | undefined = inject('minecraftService');
const id = ref();

const emit = defineEmits<{
  (e: 'deleteInstance', id: string): void
}>();

async function searchInstanceById(id: string) {
  instance.value = undefined;
  $instanceService?.getInstanceById(id)
    .then(i => instance.value = i)
    .catch(() => {
      router.push({name: 'not-found', query: { id: id}});
    });
}

function deleteInstance(id: string) {
  $instanceService?.deleteInstance(id)
      .then(() => emit('deleteInstance', id));
}

function launchGame() {
  if (instance.value) {
    $minecraftService?.launchGame(instance.value);
  }
}

watchEffect(async () => {
  if (route.params.id) {
    id.value = route.params.id;
    await searchInstanceById(id.value);
  }
})
</script>
<template>
  <div class="w-full h-screen flex flex-col" v-if="instance">
    <section class="border-b-2 border-gray-700/30 py-4 space-y-6">
      <h1 v-if="instance?.title">{{ instance?.title }}
        <span class="text-xs" v-if="instance?.versions?.self">
          v{{ instance?.versions?.self }}
        </span>
      </h1>
      <span class="inline-flex items-center gap-2 h-[20px]">
        <span class="text-sm font-medium mr-2 p-3 rounded bg-green-900 text-green-300 inline-flex items-center h-full" v-if="instance?.versions?.minecraft">
          <img src="../../assets/minecraft_logo.ico" class="w-4 h-4 mr-1.5" alt="Minecraft logo" />
          <span class="text-white font-medium text-xs">Minecraft version {{ instance.versions.minecraft.name }}</span>
        </span>
        <span class="text-sm font-medium mr-2 p-3 rounded bg-gray-900 text-gray-300 inline-flex items-center h-full" v-if="instance?.versions?.forge">
          <img src="../../assets/forge_logo.ico" class="w-4 h-4 mr-1.5" alt="Forge logo" />
          <span class="text-white font-medium text-xs">Forge version {{ instance.versions.forge.name }}</span>
        </span>
        <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full" v-if="instance?.versions?.fabric">
          <img src="../../assets/fabric_logo.png" class="w-4 h-4 mr-1.5" alt="Fabric logo" />
          <span class="text-white font-medium text-xs">Fabric version {{ instance.versions.fabric.name }}</span>
        </span>
        <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full" v-if="instance?.versions?.quilt">
          <img src="../../assets/quilt_logo.svg" class="w-4 h-4 mr-1.5" alt="Quilt logo" />
          <span class="text-white font-medium text-xs">Quilt version {{ instance.versions.quilt.name }}</span>
        </span>
        <button @click="deleteInstance(id)">Delete instance</button>
      </span>
    </section>
    <section class="flex-grow py-4 space-y-6">
      <div class="grid grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile title="Mods" subtitle="You have X mods installed" button-title="Manage mods"></Tile>
        <Tile title="Shaders" subtitle="You have X shaders installed" button-title="Manage shaders"></Tile>
        <Tile title="Resource Packs"
              subtitle="You have X resources packs installed"
              button-title="Manage resource packs"></Tile>
      </div>
    </section>
    <section class="border-t-2 border-gray-700/30 py-4 space-y-6 ">
      <button type="submit" class="primary" v-on:click="launchGame()">
        Launch Game
        <svg class="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
        </svg>
      </button>
    </section>
  </div>
</template>
