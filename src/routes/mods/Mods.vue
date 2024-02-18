<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import {useRoute, useRouter} from "vue-router";
import {ApiService, InstanceSettings, Mod, TaskEvent} from "mine4ease-ipc-api";
import {ObjectWithState} from "../../shared/models/State";
import {TaskListeners} from "../../shared/listeners/TaskListeners";
import {ModService} from "../../shared/services/ModService";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const $apiService: ApiService | undefined = inject('apiService');
const $modService: ModService | undefined = inject('modService');

const route = useRoute();
const router = useRouter();
const emit = defineEmits<{
  (e: 'addMod', id: string): void
}>();

const id = ref();

const filter = ref();
const mods: Ref<(Mod & ObjectWithState)[]> = ref([]);

function searchMod(filter: string) {
  let minecraftVersion = instance?.value?.versions.minecraft.name;
  let modLoader = instance?.value?.modLoader;
  if(!minecraftVersion || !modLoader) {
    return;
  }

  $apiService?.searchMods(filter, minecraftVersion, modLoader)
  .then(mod => mods.value = mod);
}

function addMod(mod: Mod & ObjectWithState) {
  $modService?.addMod(mod, instance?.value!)
      .then(eventId => {
        mod.eventId = eventId;
        mod.state = "loading"
      });
}

function updateEvent(_event: any, value: TaskEvent) {
  mods.value.forEach(mod => {
    if(mod.eventId == value.id) {
      mod.state = "finished"
    }
  });
}

const listener = new TaskListeners();
listener.start(updateEvent);

watchEffect(() => {
  if (route.params.id) {
    id.value = route.params.id;
  }
})
</script>
<template>
  <section class="grid grid-cols-[1fr_175px] gap-2 sticky top-0">
    <section class="space-y-2">
      <section class="flex flex-row items-center gap-4 border-2 rounded-lg border-gray-700/30 bg-black/30 px-4 py-3 sticky top-0 shadow-md shadow-black/40">
        <button @click="router.back()" class="text-2xl bg-transparent">
          <font-awesome-icon :icon="['fas', 'arrow-left']" class="flex" />
        </button>
        <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
        <div class="relative">
          <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg class="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input type="search" id="default-search" v-model="filter" v-on:keyup.enter="searchMod(filter)" class="block w-full p-2 ps-10 pe-16 text-sm text-white border border-gray-500 rounded-lg bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:border-gray-500" placeholder="Search ..." required>
          <button class="text-white absolute inset-y-1 end-1 bg-gray-700 hover:bg-gray-600 focus:ring-1 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm p-1" v-on:click="searchMod(filter)">Search</button>
        </div>
      </section>
      <section class="space-y-2 overflow-y-hidden">
        <article v-for="mod in mods" class="border-2 rounded-lg border-gray-700/30 bg-black/30 shadow-md shadow-black/40">
          <div class="grid grid-cols-[100px_1fr_81px] gap-4 px-4 py-5">
            <img v-bind:src="mod.iconUrl" v-bind:alt="mod.displayName + ' icon'" class="w-24 h-24">
            <div class="justify-self-start flex flex-col justify-between">
              <h3>{{ mod.displayName }}</h3>
              <p class="text-sm">{{ mod.description }}</p>
              <p class="text-gray-400 text-sm">by {{mod.authors?.map(a => a.name).join(', ')}}</p>
            </div>
            <div class="flex items-center justify-center">
              <button type="button" class="px-5 py-2.5 primary" v-on:click="addMod(mod)" v-if="!mod.state">
                <font-awesome-icon :icon="['fas', 'add']" />
                Add
              </button>
              <font-awesome-icon class="flex w-7 h-7" :icon="['fas', 'gear']" spin v-if="mod.state === 'loading'" />
              <font-awesome-icon class="flex w-7 h-7 text-green-600" :icon="['fas', 'circle-check']" v-if="mod.state === 'finished'" />
              <font-awesome-icon class="flex w-7 h-7 text-red-600" :icon="['fas', 'circle-xmark']" v-if="mod.state === 'errored'" />
            </div>
          </div>
          <div class="border-b-2 border-amber-400"></div>
          <div class="flex flex-row gap-4 px-4 py-5">
            <div class="justify-self-start flex flex-row items-center gap-2 justify-between" v-for="categorie in mod.categories">
              <img v-bind:src="categorie.iconUrl" v-bind:alt="categorie.name + ' icon'" class="w-7 h-7">
              <span class="text-sm">{{categorie.name}}</span>
            </div>
          </div>
        </article>
      </section>
    </section>
    <section class="gap-4 border-2 rounded-lg border-gray-700/30 bg-black/30 px-4 py-3 shadow-md shadow-black/40 sticky top-0 h-[90vh]">
      test
    </section>
  </section>
</template>
