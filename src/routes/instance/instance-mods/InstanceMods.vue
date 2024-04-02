<script setup lang="ts">
import {inject, ref, Ref, watchEffect} from "vue";
import {Instance, InstanceSettings, Mod, ModSettings} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";
import ModTile from "../../../shared/components/mods/ModTile.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners";
import {ModService} from "../../../shared/services/ModService.ts";
import EventWrapper from "../../../shared/components/events/EventWrapper.vue";
import {Transitions} from "../../../shared/models/Transitions.ts";
import {redirect} from "../../../shared/utils/Utils.ts";
import BackToLastPage from "../../../shared/components/buttons/BackToLastPage.vue";
import {WithUpdate} from "../../../shared/models/Update.ts";

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

async function updateMod(mod: Mod) {
  if (!instance?.value) return;

  return $modService?.updateMod(mod, instance.value);
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
  if (!instance?.value) return;

  return $modService?.deleteMod(mod, instance.value);
}

function backtoLastPage() {
  if (instance?.value) {
    return router.push(`/${instance.value?.id}`);
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
  <div class="flex flex-col gap-4 mb-4">
    <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 shadow-md shadow-black/40 p-4">
      <BackToLastPage @back-to-last-page="() => backtoLastPage()"></BackToLastPage>
      <button type="button" class="px-5 py-2.5 space-x-2 primary" @click="$router.push('/mods')">
        <font-awesome-icon :icon="['fas', 'add']" />
        <span>Add a new mod</span>
      </button>
      <button type="button" class="px-5 py-2.5 space-x-2 secondary"
              v-if="mods && [...mods.values()].findIndex((m: Mod & WithUpdate)  => m.isUpdateNeeded) != -1"
              @click="updateAllMod()">
        <font-awesome-icon :icon="['fas', 'circle-up']" />
        <span>Update all mods</span>
        <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold text-amber-800 bg-amber-200 rounded-full">
          {{ mods && [...mods.values()].filter((m: Mod & WithUpdate) => m.isUpdateNeeded).length }}
        </span>
      </button>
      <div class="flex flex-row items-center gap-2" v-if="mods?.size">
        <button type="button" class="rounded-lg p-1.5 bg-transparent hover:bg-gray-800 hover:text-white ring-gray-700" @click="checkForUpdates()">
          <font-awesome-icon :icon="['fas', 'arrow-rotate-right']" :class="isReloading ? 'fa-spin': ''" size="2xl" />
        </button>
        <span>Check for update</span>
      </div>
    </section>
  </div>
  <section class="flex flex-col overflow-y-auto">
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
                v-on:click="s.createEvent(deleteMod(mod), () => getMods())">
          <font-awesome-icon :icon="['fas', 'trash-can']" />
          <span>Delete</span>
        </button>
      </EventWrapper>
    </ModTile>
  </section>
</template>
