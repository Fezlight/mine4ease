<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {IInstanceService, IMinecraftService, Instance, InstanceSettings, TaskEvent} from "mine4ease-ipc-api";
import {RouteLocationRaw} from "vue-router";
import Tile from "../../../shared/components/Tile.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners.ts";
import {Transitions} from "../../../shared/models/Transitions.ts";

const instance: Ref<InstanceSettings | undefined> = inject('currentInstance');

const $instanceService: IInstanceService | undefined = inject('instanceService');
const $minecraftService: IMinecraftService | undefined = inject('minecraftService');
const id = ref();

const emit = defineEmits<{
  (e: 'deleteInstance', id: string): void
  (e: 'redirect', to: Transitions): void
}>();

function deleteInstance(id: string) {
  $instanceService?.deleteInstance(id)
  .then(() => emit('deleteInstance', id));
}

function launchGame() {
  if (instance.value) {
    $minecraftService?.launchGame(instance.value);
  }
}

function redirect(route: RouteLocationRaw, instance: Instance) {
  let transition: Transitions = {
    route: route,
    instance: instance
  }

  emit('redirect', transition);
}

const events: Ref<{ [key: string]: TaskEvent }> = ref({});

function updateEvent(_event: any, value: TaskEvent) {
  events.value[value.id] = value;
}

const listener = new TaskListeners();
listener.start(updateEvent);
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
        </span>
        <span class="space-x-4">
          <button type="button" class="danger px-5 py-2.5" @click="deleteInstance(id)">
            <font-awesome-icon class="text-white mr-2 w-3.5 h-3.5" :icon="['fas', 'trash-can']" />
            <span>Delete instance</span>
          </button>
          <button type="button" class="primary px-5 py-2.5" v-on:click="launchGame()">
            Play
            <font-awesome-icon class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'play']" bounce />
          </button>
        </span>
      </div>
    </section>
    <section class="flex-grow py-4 space-y-6">
      <div class="grid grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile title="Mods" subtitle="You have X mods installed" button-title="Manage mods" @action="redirect({name: 'instance-mods', params: {id: id}}, instance)"></Tile>
        <Tile title="Shaders" subtitle="You have X shaders installed" button-title="Manage shaders" @action="redirect({name: 'instance-shaders', params: {id: id}}, instance)"></Tile>
        <Tile title="Resource Packs" subtitle="You have X resources packs installed" button-title="Manage resource packs" @action="redirect({name: 'instance-ressource-packs', params: {id: id}}, instance)"></Tile>
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
