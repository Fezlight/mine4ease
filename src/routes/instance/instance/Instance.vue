<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import {IInstanceService, IMinecraftService, InstanceSettings, Mod, TaskEvent} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import Tile from "../../../shared/components/Tile.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners";
import {Transitions} from "../../../shared/models/Transitions";
import {redirect} from "../../../shared/utils/Utils";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

const route = useRoute();
const $instanceService: IInstanceService | undefined = inject('instanceService');
const $minecraftService: IMinecraftService | undefined = inject('minecraftService');
const mods: Ref<Map<string, Mod> | undefined> = ref();
const loadingGame = ref(false);

const emit = defineEmits<{
  (e: 'deleteInstance', id: string): void
  (e: 'redirect', to: Transitions): void
}>();

function deleteInstance(id: string) {
  $instanceService?.deleteInstance(id)
  .then(() => emit('deleteInstance', id));
}

function launchGame() {
  if(loadingGame.value) {
    return;
  }

  loadingGame.value = true;
  if (instance?.value) {
    $minecraftService?.launchGame(instance.value)
      .then(() => loadingGame.value = false);
  }
}

const events: Ref<{ [key: string]: TaskEvent }> = ref({});

function updateEvent(_event: any, value: TaskEvent) {
  events.value[value.id] = value;
}

function openInstanceFolder() {
  if(!instance?.value?.id) {
    return;
  }
  $instanceService?.openFolder(instance?.value?.id);
}

async function getMods() {
  let modsReq = await fetch(`mine4ease-instance://${instance?.value?.id}/mods`)
    .then(res => res.json())
    .catch(() => undefined);

  mods.value = modsReq?.mods;
}

function isModded() {
  return !!instance?.value?.versions?.fabric
      || !!instance?.value?.versions?.forge
      || !!instance?.value?.versions?.quilt;
}

const listener = new TaskListeners();
listener.start(updateEvent);

watchEffect(() => {
  if (route.params.id && isModded()) {
    getMods();
  }
})
</script>
<template>
  <div class="w-full h-screen flex flex-col" v-if="instance">
    <section class="border-b-2 border-gray-700/30 py-4">
      <h1>{{ instance.title }}
        <span class="text-xs" v-if="instance?.versions?.self">
          v{{ instance?.versions?.self }}
        </span>
      </h1>
      <div class="flex flex-row items-end">
        <span class="inline-flex items-center gap-2 flex-grow h-[20px]">
          <span class="text-sm font-medium mr-2 p-3 rounded bg-green-900 text-green-300 inline-flex items-center h-full"
                v-if="instance?.versions?.minecraft">
            <img src="../../../assets/minecraft_logo.ico" class="w-4 h-4 mr-1.5" alt="Minecraft logo" />
            <span class="text-white font-medium text-xs">Minecraft version {{ instance.versions.minecraft.name }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded bg-gray-900 text-gray-300 inline-flex items-center h-full"
                v-if="instance?.versions?.forge">
            <img src="../../../assets/forge_logo.ico" class="w-4 h-4 mr-1.5" alt="Forge logo" />
            <span class="text-white font-medium text-xs">Forge version {{ instance.versions.forge.name.replace('forge-', '') }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full"
                v-if="instance?.versions?.fabric">
            <img src="../../../assets/fabric_logo.png" class="w-4 h-4 mr-1.5" alt="Fabric logo" />
            <span class="text-white font-medium text-xs">Fabric version {{ instance.versions.fabric.name }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full"
                v-if="instance?.versions?.quilt">
            <img src="../../../assets/quilt_logo.svg" class="w-4 h-4 mr-1.5" alt="Quilt logo" />
            <span class="text-white font-medium text-xs">Quilt version {{ instance.versions.quilt.name }}</span>
          </span>
          <button class="flex items-center gap-2" @click="openInstanceFolder()">
            Open folder
            <font-awesome-icon :icon="['fas', 'up-right-from-square']" />
          </button>
        </span>
        <span class="space-x-4">
          <button type="button" class="danger px-5 py-2.5" @click="deleteInstance(instance.id)">
            <font-awesome-icon class="text-white mr-2 w-3.5 h-3.5" :icon="['fas', 'trash-can']" />
            <span>Delete instance</span>
          </button>
          <button type="button" class="primary px-5 py-2.5" v-on:click="launchGame()" :disabled="loadingGame">
            Play
            <font-awesome-icon v-if="loadingGame" class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'spinner']" spin />
            <font-awesome-icon v-else class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'play']" bounce />
          </button>
        </span>
      </div>
    </section>
    <section class="flex-grow py-4 space-y-6">
      <div class="grid grid-cols-3 gap-3">
        <Tile v-if="isModded()" title="Mods" :subtitle="`You have ${mods ? Object.keys(mods).length : 0} mods installed`"
              button-title="Manage mods"
              @action="redirect({path: `/${instance.id}/mods`}, emit)"></Tile>
        <Tile v-if="isModded()" title="Shaders" subtitle="You have ?? shaders installed"
              :disabled="true"
              button-title="Manage shaders"
              @action="redirect({name: 'instance-shaders', params: {id: id}}, emit)"></Tile>
        <Tile title="Resource Packs" subtitle="You have ?? resources packs installed"
              :disabled="true"
              button-title="Manage resource packs"
              @action="redirect({name: 'instance-ressource-packs', params: {id: id}}, emit)"></Tile>
      </div>
      <div class="flex flex-col">
        <span v-for="event in events">{{ event.name }} : {{ event.state }}</span>
      </div>
    </section>
    <section class="flex flex-row border-t-2 border-gray-700/30 py-4 space-x-6">
      Footer
    </section>
  </div>
</template>
