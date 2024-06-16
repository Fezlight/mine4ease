<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import {IMinecraftService, InstanceSettings} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";
import {Transitions} from "../../../shared/models/Transitions";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import ProgressBar from "../../../shared/components/ProgressBar.vue";
import {InstanceService} from "../../../shared/services/InstanceService";
import EventWrapper from "../../../shared/components/events/EventWrapper.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners.ts";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

const route = useRoute();
const router = useRouter();
const $instanceService: InstanceService | undefined = inject('instanceService');
const $minecraftService: IMinecraftService | undefined = inject('minecraftService');
const loadingGame = ref(false);
const isUpdateNeeded = ref(false);

const emit = defineEmits<{
  (e: 'deleteInstance', id: string): void
  (e: 'redirect', to: Transitions): void
}>();

function deleteInstance(id: string) {
  $instanceService?.deleteInstance(id)
  .then(() => emit('deleteInstance', id));
}

function launchGame() {
  if (loadingGame.value) {
    return;
  }

  loadingGame.value = true;
  if (instance?.value) {
    $minecraftService?.launchGame(instance.value)
    .then(() => loadingGame.value = false);
  }
}

function goToSettings() {
  if (String(router.currentRoute.value.fullPath).includes('settings')) {
    router.push({path: `/instance/${instance?.value?.id}`});
  } else {
    router.push({path: `/instance/${instance?.value?.id}/settings`});
  }
}

async function update(): Promise<string> {
  if (!instance?.value?.id) {
    return "";
  }
  return $instanceService!.updateInstance(instance?.value?.id)
}

function openInstanceFolder() {
  if (!instance?.value?.id) {
    return;
  }
  $instanceService?.openFolder(instance?.value?.id);
}

async function checkIfUpdateIsNeeded() {
  if (!instance?.value) {
    return false;
  }
  $instanceService?.isUpdateNeeded(instance?.value)
      .then(isUpdatable => isUpdateNeeded.value = isUpdatable);
}

watchEffect(() => {
  if (route.params.id) {
    checkIfUpdateIsNeeded();
  }
})

const listener = new TaskListeners();
</script>
<template>
  <InstanceContent v-if="instance" class="relative" :fluid="true">
    <section class="border-b-2 border-gray-700/30 flex flex-col justify-between sticky top-0 bg-gray-800 p-6 min-h-[120px]">
      <h2>
        <span>{{ instance.title }}</span>
        <span class="text-xs" v-if="instance?.versions?.self">
          v{{ instance?.versions?.self }}
        </span>
      </h2>
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
          <button class="flex items-center gap-2 p-1.5" @click="openInstanceFolder()">
            Open folder
            <font-awesome-icon :icon="['fas', 'up-right-from-square']" />
          </button>
        </span>
        <span class="flex flex-row space-x-4 items-center">
          <button @click="goToSettings()" class="flex">
            <font-awesome-icon :icon="['fas', 'gear']" />
          </button>
          <button type="button" class="danger px-5 py-2.5" @click="deleteInstance(instance.id)">
            <font-awesome-icon class="text-white mr-2 w-3.5 h-3.5" :icon="['fas', 'trash-can']" />
            <span>Delete instance</span>
          </button>
          <EventWrapper :listener="listener" v-slot:default="s" v-if="isUpdateNeeded">
            <button type="button" class="secondary px-5 py-2.5 space-x-2"
                    v-on:click="s.createEvent(update(), () => isUpdateNeeded = false)">
              <span>Update available</span>
              <font-awesome-icon :icon="['fas', 'circle-arrow-up']" beat />
            </button>
          </EventWrapper>
          <button type="button" class="primary px-5 py-2.5" v-on:click="launchGame()" :disabled="loadingGame" v-else>
            Play
            <font-awesome-icon v-if="loadingGame" class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'spinner']" spin />
            <font-awesome-icon v-else class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'play']" bounce />
          </button>
        </span>
      </div>
    </section>
    <section class="flex-grow">
      <router-view />
    </section>
    <ProgressBar></ProgressBar>
  </InstanceContent>
</template>
