<script setup lang="ts">
import ModPackTile from "../../../shared/components/modpacks/ModPackTile.vue";
import {ApiType, Category, getByType, IInstanceService, Instance, ModLoader, ModPack, Version} from "mine4ease-ipc-api";
import {inject, onMounted, provide, Ref, ref} from "vue";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";
import EventWrapper from "../../../shared/components/events/EventWrapper.vue";
import {Transitions} from "../../../shared/models/Transitions";
import {TaskListeners} from "../../../shared/listeners/TaskListeners";
import {redirect} from "../../../shared/utils/Utils";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import BackToLastPage from "../../../shared/components/buttons/BackToLastPage.vue";
import {useRoute, useRouter} from "vue-router";
import {SearchQuery} from "../../../shared/models/SearchQuery.ts";

const emit = defineEmits<{
  (e: 'redirect', to: Transitions): void,
  (e: 'createInstance', instance: Instance, selected: boolean): void
  (e: 'deleteInstance', instanceId: number): void
}>();

const $instanceService: IInstanceService | undefined = inject('instanceService');
const apiType = ApiType.FEEDTHEBEAST;
provide('apiType', apiType);

const router = useRouter();
const route = useRoute();


const filter = ref("");
const minecraftVersion: Ref<Version[] | undefined> = ref();
const modpacks: Ref<ModPack[]> = ref([]);
const selectedCategories: Ref<Category[]> = ref([]);
const selectedVersion: Ref<string> = ref("");
const modpackList: Ref<typeof LoadingComponent | undefined> = ref();
const categoryFilter: Ref<typeof LoadingComponent | undefined> = ref();

async function initAllFilter() {
  let promises: any[] = [
    getAllMinecraftVersions()
  ];

  promises.push(categoryFilter.value?.executePromise());

  await Promise.all(promises)
  .then(() => initFilter());
}

function initFilter() {
  if (route.query.filter) {
    filter.value = <string>route.query.filter;
  }
  if (route.query.version) {
    selectedVersion.value = <string>route.query.version;
  }

  modpackList.value?.executePromise();
}

async function searchModPack() {
  const query: SearchQuery = {
    filter: filter.value,
    version: selectedVersion.value
  };
  router.push({query: query});

  modpacks.value = [];

  return getByType(apiType).searchModPacks(filter.value, ModLoader.FORGE, selectedVersion.value, selectedCategories.value)
  .then(packs => modpacks.value = <ModPack[]>packs);
}

async function installModPack(modpack: ModPack) {
  if (!$instanceService) return Promise.reject();

  return $instanceService.createInstanceByModPack(modpack);
}

async function getAllMinecraftVersions() {
  return getByType(ApiType.CURSE).searchVersions()
  .then(versions => {
    if (!versions) {
      return;
    }

    minecraftVersion.value = versions.filter(v => !/[a-z]/.test(v.name));
  });
}

function backToLastPage() {
  return router.push(`/instance/create`);
}

onMounted(() => {
  initAllFilter();
})
const listener = new TaskListeners();
</script>
<template>
  <InstanceContent>
    <section class="flex flex-row overflow-y-auto gap-4 h-full">
      <section class="flex flex-col flex-grow">
        <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 px-4 py-3 shadow-md shadow-black/40 flex-grow-0 mb-4">
          <BackToLastPage @back-to-last-page="backToLastPage()"></BackToLastPage>
          <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
          <div class="relative">
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg class="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
              </svg>
            </div>
            <input type="search" id="default-search" v-model="filter"
                   v-on:keyup.enter="($refs.modpackList as typeof LoadingComponent).executePromise()"
                   class="block w-full p-2 ps-10 pe-16 text-sm text-white border border-gray-500 rounded-lg bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:border-gray-500" placeholder="Search ..." required>
            <button class="text-white absolute inset-y-1 end-1 bg-gray-700 hover:bg-gray-600 focus:ring-1 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm p-1"
                    v-on:click="($refs.modpackList as typeof LoadingComponent).executePromise()">
              Search
            </button>
          </div>
          <select v-model="selectedVersion" v-on:change="($refs.modpackList as typeof LoadingComponent).executePromise()">
            <option value="">No version selected</option>
            <option v-for="v in minecraftVersion" :value="v.name">{{ v.name }}</option>
          </select>
        </section>
        <div class="flex flex-col gap-2 h-full overflow-y-auto">
          <LoadingComponent class="flex flex-col overflow-y-auto flex-grow" :promise="() => searchModPack()" ref="modpackList">
            <ModPackTile v-for="modpack in modpacks" :modpack="modpack" @redirect="(t: Transitions) => redirect(t.route, emit)" class="mb-4" :key="modpack.id">
              <EventWrapper :listener="listener" v-slot:default="s">
                <button type="button" class="px-5 py-2.5 primary inline-block space-x-2" v-on:click="s.createEvent(installModPack(modpack), i => emit('createInstance', i, false))">
                  <font-awesome-icon :icon="['fas', 'add']" />
                  <span>Install</span>
                </button>
              </EventWrapper>
            </ModPackTile>
            <span v-if="modpacks.length === 0" class="flex items-center h-full justify-center text-2xl">No result found</span>
          </LoadingComponent>
        </div>
      </section>
    </section>
  </InstanceContent>
</template>
