<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {LocationQueryValue, useRoute, useRouter} from "vue-router";
import {ApiType, Category, getByType, InstanceSettings, Mod} from "mine4ease-ipc-api";
import {TaskListeners} from "../../shared/listeners/TaskListeners";
import ModTile from "../../shared/components/mods/ModTile.vue";
import {redirect} from "../../shared/utils/Utils";
import {Transitions} from "../../shared/models/Transitions";
import {ModService} from "../../shared/services/ModService";
import EventWrapper from "../../shared/components/events/EventWrapper.vue";
import BackToLastPage from "../../shared/components/buttons/BackToLastPage.vue";
import LoadingComponent from "../../shared/components/LoadingComponent.vue";
import InstanceContent from "../../shared/components/instance/InstanceContent.vue";
import {CURSE_FORGE_MINECRAFT_MOD_CLASS_ID} from "../../../mine4ease-ipc-api";
import {SearchQuery} from "../../shared/models/SearchQuery.ts";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
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
const modList: Ref<typeof LoadingComponent | undefined> = ref();

function initFilter() {
  if (route.query.filter) {
    filter.value = <string>route.query.filter;
  }
  if (route.query.categories) {
    let categoriesId: string | LocationQueryValue[] = route.query.categories;

    categories.value.filter(cat => {
      if (Array.isArray(categoriesId)) {
        return categoriesId.findIndex(id => Number(id) === cat.id) !== -1
      }
      return Number(categoriesId) === cat.id;
    }).forEach(category => {
      addRemoveCat(category);
    });
  }

  modList.value?.executePromise();
}

function searchMod() {
  let minecraftVersion = instance?.value?.versions.minecraft.name;
  let modLoader = instance?.value?.modLoader;
  if (!minecraftVersion || !modLoader) {
    return;
  }

  let categoriesId: number[] | undefined;
  if (route.query.categories) {
    categoriesId = Array.isArray(route.query.categories) ? route.query.categories.map(cat => Number(cat)) : [Number(route.query.categories)];
  }
  const query: SearchQuery = {
    filter: filter.value,
    categories: selectedCategories.value.map(cat => cat.id) ?? categoriesId
  };
  router.push({query: query});

  mods.value = [];

  return getByType(ApiType.CURSE).searchMods(filter.value, minecraftVersion, modLoader, selectedCategories.value)
  .then(mod => mods.value = <Mod[]>mod);
}

async function getAllCategories() {
  return getByType(ApiType.CURSE).getAllCategories(CURSE_FORGE_MINECRAFT_MOD_CLASS_ID)
  .then(cat => categories.value = cat);
}

async function searchWithCategories(category: Category) {
  addRemoveCat(category);

  modList.value?.executePromise()
  .catch(() => addRemoveCat(category));
}

function addRemoveCat(category: Category) {
  let index = selectedCategories.value.findIndex(cat => cat.id === category.id);

  category.selected = !category.selected;
  if (index === -1) {
    selectedCategories.value.push(category);
  } else {
    selectedCategories.value.splice(index, 1);
  }
}

function orderedCategories(categories: Category[]) {
  return [...categories].filter(c => !c.selected).sort((c1, c2) => {
    if (c1.name > c2.name) {
      return 1;
    } else if (c1.name < c2.name) {
      return -1;
    }
    return 0;
  });
}

function backToLastPage() {
  if (instance?.value) {
    return router.push(`/instance/${instance.value?.id}/mods`);
  }
  return router.back();
}

function addMod(mod: Mod) {
  if (!instance?.value || !$modService) return Promise.reject();

  return $modService.addMod(mod, instance.value);
}

const listener = new TaskListeners();
</script>
<template>
  <InstanceContent>
    <section class="flex flex-row overflow-y-auto gap-4 h-full">
      <section class="flex flex-col flex-grow">
        <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 px-4 py-3 shadow-md shadow-black/40 flex-grow-0 mb-4">
          <BackToLastPage @back-to-last-page="() => backToLastPage()"></BackToLastPage>
          <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
          <div class="relative">
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg class="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
              </svg>
            </div>
            <input type="search" id="default-search" v-model="filter"
                   v-on:keyup.enter="($refs.modList as typeof LoadingComponent).executePromise()"
                   class="block w-full p-2 ps-10 pe-16 text-sm text-white border border-gray-500 rounded-lg bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:border-gray-500" placeholder="Search ..." required>
            <button class="text-white absolute inset-y-1 end-1 bg-gray-700 hover:bg-gray-600 focus:ring-1 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm p-1"
                    v-on:click="($refs.modList as typeof LoadingComponent).executePromise()">Search
            </button>
          </div>
        </section>
        <LoadingComponent class="flex flex-col overflow-y-auto flex-grow" :promise="() => searchMod()" ref="modList">
          <ModTile v-for="mod in mods" :mod="mod" @redirect="(t: Transitions) => redirect(t.route, emit)" class="mb-4" :key="mod.id">
            <EventWrapper :listener="listener" v-slot:default="s">
              <button type="button" class="px-5 py-2.5 primary inline-block space-x-2" v-on:click="s.createEvent(addMod(mod))">
                <font-awesome-icon :icon="['fas', 'add']" />
                <span>Install</span>
              </button>
            </EventWrapper>
          </ModTile>
          <span v-if="mods.length === 0" class="flex max-window-height items-center justify-center text-2xl">No result found</span>
        </LoadingComponent>
      </section>
      <section class="flex flex-col flex-grow rounded-lg bg-black/30 shadow-md shadow-black/40 overflow-y-auto min-w-[200px] max-w-[200px] mb-1">
        <LoadingComponent class="flex flex-col gap-3 p-4 h-full" :promise="() => getAllCategories().then(() => initFilter())" :execute-automation="true">
          <button type="button" v-for="category in selectedCategories" :key="category.id" @click="searchWithCategories(category)" class="flex flex-row text-left gap-2 rounded border-2 border-gray-800 px-2 py-1 bg-gray-800">
            <img :src="category.iconUrl" :alt="category.name + ' icon'" class="w-7 h-7">
            <span class="text-sm">{{ category.name }}</span>
          </button>
          <hr class="border-amber-400" v-if="selectedCategories.length">
          <button type="button" v-for="category in orderedCategories(categories)" :key="category.id" @click="searchWithCategories(category)" class="flex flex-row text-left gap-2 px-2 py-1">
            <img :src="category.iconUrl" :alt="category.name + ' icon'" class="w-7 h-7">
            <span class="text-sm">{{ category.name }}</span>
          </button>
        </LoadingComponent>
      </section>
    </section>
  </InstanceContent>
</template>
