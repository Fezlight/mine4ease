<script setup lang="ts">
import {inject, ref, Ref, watchEffect} from "vue";
import {InstanceSettings, Mod, ModSettings} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";
import ModTile from "../../../shared/components/mods/ModTile.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners";
import {ModService} from "../../../shared/services/ModService.ts";
import EventWrapper from "../../../shared/components/events/EventWrapper.vue";
import {Transitions} from "../../../shared/models/Transitions.ts";
import {redirect} from "../../../shared/utils/Utils.ts";

const route = useRoute();
const router = useRouter();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const $modService: ModService | undefined = inject('modService');
const mods: Ref<Map<string, Mod> | undefined> = ref(new Map);

const emit = defineEmits<{
  (e: 'redirect', to: Transitions): void
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

  // TODO
  return $modService?.updateMod(mod, instance.value);
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
      <button @click="backtoLastPage()" class="text-2xl bg-transparent">
        <font-awesome-icon :icon="['fas', 'arrow-left']" class="flex" />
      </button>
      <button type="button" class="px-5 py-2.5 primary" @click="$router.push('/mods')">
        <font-awesome-icon :icon="['fas', 'add']" />
        Add a new mod
      </button>
      <button type="button" class="px-5 py-2.5 secondary">
        <font-awesome-icon :icon="['fas', 'circle-up']" />
        Update all mods
      </button>
    </section>
  </div>
  <section class="flex flex-col overflow-y-auto">
    <ModTile v-for="[modId, mod] in mods" :mod="mod" @redirect="(t: Transitions) => redirect(t.route, emit)" class="mb-4" v-bind:key="modId">
      <EventWrapper :listener="listener" v-slot:default="s">
        <button type="button" class="px-5 py-2.5 secondary inline-block space-x-1" v-on:click="s.createEvent(updateMod(mod))">
          <font-awesome-icon :icon="['fas', 'circle-up']" />
          <span>Update</span>
        </button>
      </EventWrapper>
      <EventWrapper :listener="listener" v-slot:default="s">
        <button type="button" class="px-5 py-2.5 danger inline-block space-x-1"
                v-on:click="s.createEvent(deleteMod(mod), () => mods?.delete(modId))">
          <font-awesome-icon :icon="['fas', 'trash-can']" />
          <span>Delete</span>
        </button>
      </EventWrapper>
    </ModTile>
  </section>
</template>
