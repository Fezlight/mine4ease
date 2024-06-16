<script setup lang="ts">
import {inject, ref, Ref, watchEffect} from "vue";
import {Instance, InstanceSettings, Mod, ModSettings} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";
import ModTile from "../../../../shared/components/mods/ModTile.vue";
import {TaskListeners} from "../../../../shared/listeners/TaskListeners";
import {ModService} from "../../../../shared/services/ModService.ts";
import EventWrapper from "../../../../shared/components/events/EventWrapper.vue";
import {Transitions} from "../../../../shared/models/Transitions.ts";
import {redirect} from "../../../../shared/utils/Utils.ts";
import {WithUpdate} from "../../../../shared/models/Update.ts";
import BottomNavBar from "../../../../shared/components/bottom-nav-bar/BottomNavBar.vue";
import InstanceSubContent from "../../../../shared/components/instance/InstanceSubContent.vue";

const route = useRoute();
const router = useRouter();
const instance: Ref<InstanceSettings> | undefined = inject('currentInstance');
const $modService: ModService | undefined = inject('modService');
const mods: Ref<Map<string, Mod & WithUpdate> | undefined> = ref(new Map);
const isReloading: Ref<boolean> = ref(false);
const updateButton: Ref<HTMLButtonElement[]> = ref([]);

const emit = defineEmits<{
  (e: 'redirect', to: Transitions): void,
  (e: 'createInstance', instance: Instance): void
  (e: 'deleteInstance', instanceId: number): void
}>();


async function getMods() {
  mods.value = await fetch(`mine4ease-instance://${instance?.value?.id}/mods`)
  .then(res => res.json())
  .then((mods: ModSettings) => {
    return new Map(Object.entries(mods.mods));
  })
  .catch(() => undefined);
}

async function updateMod(mod: Mod): Promise<string> {
  if (!instance?.value || !$modService) return Promise.reject();

  return $modService.updateMod(mod, instance.value);
}

async function updateAllMod() {
  if (!instance?.value) return;

  for (let button of updateButton.value) {
    button.click();
  }
}

async function checkForUpdates() {
  if (!instance?.value || !mods?.value) return;

  isReloading.value = true;
  for (const mod of mods.value?.values()) {
    mod.isUpdateNeeded = await $modService?.isUpdateNeeded(mod, instance.value)
    .catch(err => {
      console.error(err);
      return false;
    });
  }
  isReloading.value = false;
}

async function deleteMod(mod: Mod) {
  if (!instance?.value || !$modService) return Promise.reject();

  return $modService.deleteMod(mod, instance.value);
}

function backtoLastPage() {
  if (instance?.value) {
    return router.push(`/instance/${instance.value?.id}`);
  }
  return router.back();
}

function orderedByUpdateNeeded() {
  if (!mods.value) return [];
  return [...mods.value?.values()].sort((m1, m2) => {
    if (m1.isUpdateNeeded) return -1;
    if (m2.isUpdateNeeded) return 1;
    return 0;
  })
}

watchEffect(() => {
  if (route.params.id) {
    getMods();
  }
})

const listener = new TaskListeners();
</script>
<template>
  <InstanceSubContent :fluid="true">
    <section class="flex flex-col p-6 h-full">
      <ModTile v-for="mod in orderedByUpdateNeeded()" :mod="mod" @redirect="(t: Transitions) => redirect(t.route, emit)"
               class="mb-4" :key="mod.id">
        <EventWrapper :listener="listener" v-slot:default="s" v-if="mod.isUpdateNeeded">
          <button type="button" class="px-5 py-2.5 secondary inline-block space-x-2"
                  ref="updateButton"
                  v-on:click="s.createEvent(updateMod(mod), () => mod.isUpdateNeeded = false)">
            <font-awesome-icon :icon="['fas', 'circle-up']" />
            <span>Update</span>
          </button>
        </EventWrapper>
        <EventWrapper :listener="listener" v-slot:default="s">
          <button type="button" class="px-5 py-2.5 danger inline-block space-x-2"
                  v-on:click="s.createEvent(deleteMod(mod), (m: Mod) => mods?.delete(String(m.id)))">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
            <span>Delete</span>
          </button>
        </EventWrapper>
      </ModTile>
    </section>
  </InstanceSubContent>
  <bottom-nav-bar @backToLastPage="() => backtoLastPage()">
    <button type="button" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-700 group" @click="$router.push('/mods')">
      <font-awesome-icon :icon="['fas', 'add']" class="text-gray-500 group-hover:text-white" size="2xl" />
      <span class="text-sm text-gray-400 ring-gray-700 group-hover:text-white">Add new</span>
    </button>
    <button type="button" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-700 group" v-if="mods?.size" @click="checkForUpdates()">
      <font-awesome-icon :icon="['fas', 'arrow-rotate-right']" class="text-gray-500 group-hover:text-white" :class="isReloading ? 'fa-spin': ''" size="2xl" />
      <span class="text-sm text-gray-400 ring-gray-700 group-hover:text-white">Check update</span>
    </button>
    <button type="button" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-700 group"
            v-if="mods && [...mods.values()].findIndex((m: Mod & WithUpdate)  => m.isUpdateNeeded) != -1"
            @click="updateAllMod()">
      <font-awesome-icon :icon="['fas', 'circle-up']" class="text-gray-500 group-hover:text-white" size="2xl" />
      <span class="text-sm text-gray-400 ring-gray-700 group-hover:text-white">
        Update all mods
        <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold text-white bg-gray-700 rounded-full group-hover:text-gray-700 group-hover:bg-white">
          {{ mods && [...mods.values()].filter((m: Mod & WithUpdate) => m.isUpdateNeeded).length }}
        </span>
      </span>
    </button>
  </bottom-nav-bar>
</template>
