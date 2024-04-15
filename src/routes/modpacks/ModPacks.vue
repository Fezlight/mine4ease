<script setup lang="ts">
import ModPackTile from "../../shared/components/modpacks/ModPackTile.vue";
import {ApiType, Category, getByType, IInstanceService, Instance, ModLoader, ModPack} from "mine4ease-ipc-api";
import {inject, Ref, ref} from "vue";
import LoadingComponent from "../../shared/components/LoadingComponent.vue";
import EventWrapper from "../../shared/components/events/EventWrapper.vue";
import {Transitions} from "../../shared/models/Transitions";
import {TaskListeners} from "../../shared/listeners/TaskListeners";
import {redirect} from "../../shared/utils/Utils";
import InstanceContent from "../../shared/components/instance/InstanceContent.vue";
import BackToLastPage from "../../shared/components/buttons/BackToLastPage.vue";

const emit = defineEmits<{
  (e: 'redirect', to: Transitions): void,
  (e: 'createInstance', instance: Instance): void
  (e: 'deleteInstance', instanceId: number): void
}>();

const $instanceService: IInstanceService | undefined = inject('instanceService');

const filter = ref("");
const minecraftVersion = ref("1.18.2");
const modpacks: Ref<ModPack[]> = ref([]);
const selectedCategories: Ref<Category[]> = ref([]);

async function searchModPack() {
  return getByType(ApiType.CURSE).searchModPacks(filter.value, minecraftVersion.value, ModLoader.FORGE, selectedCategories.value)
  .then(packs => modpacks.value = <ModPack[]>packs);
}

async function installModPack(modpack: ModPack) {
  if (!$instanceService) return Promise.reject();

  return $instanceService.createInstanceByModPack(modpack);
}

const listener = new TaskListeners();
</script>
<template>
  <InstanceContent>
    <div class="flex flex-col gap-4 mb-4">
      <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 shadow-md shadow-black/40 p-4">
        <BackToLastPage @back-to-last-page="() => $router.back()"></BackToLastPage>
      </section>
    </div>
    <div class="flex flex-col gap-2 h-full overflow-y-auto">
      <LoadingComponent class="flex flex-col overflow-y-auto flex-grow" :promise="() => searchModPack()" ref="modList" :execute-automation="true">
        <ModPackTile v-for="modpack in modpacks" :modpack="modpack" @redirect="(t: Transitions) => redirect(t.route, emit)" class="mb-4" :key="modpack.id">
          <EventWrapper :listener="listener" v-slot:default="s">
            <button type="button" class="px-5 py-2.5 primary inline-block space-x-2" v-on:click="s.createEvent(installModPack(modpack))">
              <font-awesome-icon :icon="['fas', 'add']" />
              <span>Install</span>
            </button>
          </EventWrapper>
        </ModPackTile>
        <span v-if="modpacks.length === 0" class="flex items-center h-full justify-center text-2xl">No result found</span>
      </LoadingComponent>
    </div>
  </InstanceContent>
</template>
