<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {LocationQueryValue, useRoute, useRouter} from "vue-router";
import {ApiService, Category, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {EventsState} from "../../shared/models/State";
import {TaskListeners} from "../../shared/listeners/TaskListeners";
import ModTile from "../../shared/components/mods/ModTile.vue";
import {redirect} from "../../shared/utils/Utils";
import {Transitions} from "../../shared/models/Transitions";
import {ModService} from "../../shared/services/ModService";
import EventWrapper from "../../shared/components/events/EventWrapper.vue";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const $apiService: ApiService | undefined = inject('apiService');
const $modService: ModService | undefined = inject('modService');

const emit = defineEmits<{
  (e: 'redirect', to: Transitions): void
}>();

const router = useRouter();
const route = useRoute();

const filter = ref("");
const mods: Ref<Mod[]> = ref([]);
const categories: Ref<Category[]> = ref([]);
const selectedCategories: Ref<Category[]> = ref([]);

function initFilter() {
  if(route.query.filter) {
    filter.value = <string>route.query.filter;
  }
  if(route.query.categories) {
    let categoriesId: string | LocationQueryValue[] = route.query.categories;

    categories.value.filter(cat => {
      if(Array.isArray(categoriesId)) {
        return categoriesId.findIndex(id => Number(id) === cat.id) !== -1
      }
      return Number(categoriesId) === cat.id;
    }).forEach(category => {
      addRemoveCat(category);
    });
  }
}

function searchMod() {
  let minecraftVersion = instance?.value?.versions.minecraft.name;
  let modLoader = instance?.value?.modLoader;
  if(!minecraftVersion || !modLoader) {
    return;
  }
  const query: {filter: string, categories: number[]} = {
    filter: filter.value,
    categories: selectedCategories.value.map(cat => cat.id)
  };

  router.push({path: '/mods', query: query });

  $apiService?.searchMods(filter.value, minecraftVersion, modLoader, selectedCategories.value)
  .then(mod => mods.value = <(Mod & EventsState)[]>mod);
}

function getAllCategories() {
  return $apiService?.getAllCategories()
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
}

function orderedCategories(categories: Category[]) {
  return [...categories].filter(c=> !c.selected).sort((c1, c2) => {
    if(c1.name > c2.name) {
      return 1;
    } else if(c1.name < c2.name) {
      return -1;
    }
    return 0;
  });
}

function backtoLastPage() {
  if(instance?.value) {
    return router.push(`/${instance.value?.id}/mods`);
  }
  return router.back();
}

function addMod(mod: Mod) {
  if(!instance?.value) return;

  return $modService?.addMod(mod, instance.value);
}

getAllCategories()
  ?.then(() => initFilter())
  .then(() => searchMod());

const listener = new TaskListeners();
</script>
<template>
  <section class="flex flex-row overflow-y-auto gap-4">
    <section class="flex flex-col flex-grow">
      <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 px-4 py-3 shadow-md shadow-black/40 flex-grow-0 mb-4">
        <button @click="backtoLastPage()" class="text-2xl bg-transparent">
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
      <section class="flex flex-col overflow-y-auto flex-grow">
        <ModTile v-for="mod in mods" :mod="mod" @redirect="(t: Transitions) => redirect(t.route, emit)" class="mb-4">
          <EventWrapper :listener="listener" v-slot:default="s">
            <button type="button" class="px-5 py-2.5 primary inline-block space-x-1" v-on:click="s.createEvent(addMod(mod))" >
              <font-awesome-icon :icon="['fas', 'add']" />
              <span>Add</span>
            </button>
          </EventWrapper>
        </ModTile>
      </section>
    </section>
    <section class="rounded-lg bg-black/30 shadow-md shadow-black/40 overflow-y-auto min-w-[200px] max-w-[200px] mb-1">
      <div class="flex flex-col gap-3 p-4">
        <button type="button" v-for="category in selectedCategories" @click="addRemoveCat(category); searchMod()" class="flex flex-row text-left gap-2 rounded border-2 border-gray-800 px-2 py-1 bg-gray-800">
          <img v-bind:src="category.iconUrl" v-bind:alt="category.name + ' icon'" class="w-7 h-7">
          <span class="text-sm">{{category.name}}</span>
        </button>
        <hr class="border-amber-400" v-if="selectedCategories.length">
        <button type="button" v-for="category in orderedCategories(categories)" @click="addRemoveCat(category); searchMod()" class="flex flex-row text-left gap-2 px-2 py-1">
          <img v-bind:src="category.iconUrl" v-bind:alt="category.name + ' icon'" class="w-7 h-7">
          <span class="text-sm">{{category.name}}</span>
        </button>
      </div>
    </section>
  </section>
</template>
