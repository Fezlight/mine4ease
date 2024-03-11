<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {useRouter} from "vue-router";
import {ApiService, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {ObjectWithState} from "../../shared/models/State";
import {TaskListeners} from "../../shared/listeners/TaskListeners";
import {Category} from "../../../mine4ease-ipc-api";
import ModTile from "../../shared/components/mods/ModTile.vue";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const $apiService: ApiService | undefined = inject('apiService');

const router = useRouter();

const filter = ref("");
const mods: Ref<(Mod & ObjectWithState)[]> = ref([]);
const categories: Ref<Category[]> = ref([]);

const selectedCategories: Ref<Category[]> = ref([]);

function searchMod() {
  let minecraftVersion = instance?.value?.versions.minecraft.name;
  let modLoader = instance?.value?.modLoader;
  if(!minecraftVersion || !modLoader) {
    return;
  }

  $apiService?.searchMods(filter.value, minecraftVersion, modLoader, selectedCategories.value)
  .then(mod => mods.value = mod);
}

function getAllCategories() {
  $apiService?.getAllCategories()
      .then(cat => categories.value = cat);
}

function addRemoveCat(category: Category) {
  let index = selectedCategories.value.findIndex(cat => cat.id === category.id);

  category.selected = !category.selected;
  if(index === -1) {
    selectedCategories.value.push(category);
  } else {
    selectedCategories.value.splice(index, 1);
  }

  searchMod();
}

function orderedCategories(categories: Category[]) {
  return [...categories].filter(c=> !c.selected);
}

getAllCategories();

const listener = new TaskListeners();
</script>
<template>
  <section class="flex flex-row overflow-y-auto gap-4">
    <section class="flex flex-col flex-grow">
      <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 px-4 py-3 shadow-md shadow-black/40 flex-grow-0">
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
          <input type="search" id="default-search" v-model="filter" v-on:keyup.enter="searchMod()" class="block w-full p-2 ps-10 pe-16 text-sm text-white border border-gray-500 rounded-lg bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:border-gray-500" placeholder="Search ..." required>
          <button class="text-white absolute inset-y-1 end-1 bg-gray-700 hover:bg-gray-600 focus:ring-1 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm p-1" v-on:click="searchMod()">Search</button>
        </div>
      </section>
      <section class="flex flex-col gap-y-4 mt-4 overflow-y-auto flex-grow">
        <ModTile v-for="mod in mods" :mod="mod" :listener="listener" ></ModTile>
      </section>
    </section>
    <section class="rounded-lg bg-black/30 shadow-md shadow-black/40 overflow-y-auto min-w-[200px] max-w-[200px]">
      <div class="flex flex-col gap-3 p-4">
        <button type="button" v-for="category in selectedCategories" @click="addRemoveCat(category)" class="flex flex-row text-left gap-2 rounded border-2 border-gray-800 px-2 py-1 bg-gray-800">
          <img v-bind:src="category.iconUrl" v-bind:alt="category.name + ' icon'" class="w-7 h-7">
          <span class="text-sm">{{category.name}}</span>
        </button>
        <hr class="border-amber-400" v-if="selectedCategories.length">
        <button type="button" v-for="category in orderedCategories(categories)" @click="addRemoveCat(category)" class="flex flex-row text-left gap-2 px-2 py-1">
          <img v-bind:src="category.iconUrl" v-bind:alt="category.name + ' icon'" class="w-7 h-7">
          <span class="text-sm">{{category.name}}</span>
        </button>
      </div>
    </section>
  </section>
</template>
