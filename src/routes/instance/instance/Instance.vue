<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import {IAuthService, IMinecraftService, InstanceSettings} from "mine4ease-ipc-api";
import {useRoute, useRouter} from "vue-router";
import {Transitions} from "../../../shared/models/Transitions";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import ProgressBar from "../../../shared/components/ProgressBar.vue";
import {InstanceService} from "../../../shared/services/InstanceService";
import EventWrapper from "../../../shared/components/events/EventWrapper.vue";
import {TaskListeners} from "../../../shared/listeners/TaskListeners.ts";
import ModalBase from "../../../shared/components/modal/modal-base/ModalBase.vue";

const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

const route = useRoute();
const router = useRouter();
const modalUpdateAvailable: Ref<typeof ModalBase | null> = ref(null);
const $instanceService: InstanceService | undefined = inject('instanceService');
const $minecraftService: IMinecraftService | undefined = inject('minecraftService');
const $authService: IAuthService | undefined = inject('authService');
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

async function launchGame(): Promise<string> {
  if (!$minecraftService || !instance?.value) {
    return Promise.reject();
  }

  if (loadingGame.value) {
    return Promise.reject("Game is already launched");
  }

  loadingGame.value = true;
  return $authService!.getProfile()
  .then(() => $minecraftService.launchGame(<InstanceSettings>instance.value))
  .catch((e: Error) => {
    if (e.message.includes('MINECRAFT_AUTHENTICATION_FAILED')) {
      router.push({path: '/login'});
    }
    throw e;
  });
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
  return $instanceService!.updateInstance(instance?.value?.id);
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
    <section class="border-b-2 border-gray-700/30 flex flex-col justify-between sticky top-0 bg-gray-800 p-6 h-32.5">
      <h2 class="inline-block space-x-1">
        <span>{{ instance.title }}</span>
        <span class="text-xs text-yellow-600" v-if="instance?.versions?.self">
          {{ instance?.versions?.self.startsWith("v") ? instance?.versions?.self : 'v' + instance?.versions?.self }}
        </span>
      </h2>
      <div class="flex flex-row items-end">
        <span class="inline-flex items-center gap-2 grow h-5">
          <span class="text-sm font-medium mr-2 p-3 rounded-sm bg-green-900 text-green-300 inline-flex items-center h-full"
                v-if="instance?.versions?.minecraft">
            <img src="../../../assets/minecraft_logo.ico" class="w-4 h-4 mr-1.5" alt="Minecraft logo" />
            <span class="text-white font-medium text-xs">Minecraft version {{ instance.versions.minecraft.name }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded-sm bg-gray-900 text-gray-300 inline-flex items-center h-full"
                v-if="instance?.versions?.forge">
            <img src="../../../assets/forge_logo.ico" class="w-4 h-4 mr-1.5" alt="Forge logo" />
            <span class="text-white font-medium text-xs">Forge version {{ instance.versions.forge.name.replace('forge-', '') }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded-sm bg-orange-900 text-orange-300 inline-flex items-center h-full"
                v-if="instance?.versions?.fabric">
            <img src="../../../assets/fabric_logo.png" class="w-4 h-4 mr-1.5" alt="Fabric logo" />
            <span class="text-white font-medium text-xs">Fabric version {{ instance.versions.fabric.name.replace('fabric-', '') }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded-sm bg-purple-600 text-gray-300 inline-flex items-center h-full"
                v-if="instance?.versions?.quilt">
            <img src="../../../assets/quilt_logo.svg" class="w-4 h-4 mr-1.5" alt="Quilt logo" />
            <span class="text-white font-medium text-xs">Quilt version {{ instance.versions.quilt.name.replace('quilt-', '') }}</span>
          </span>
          <span class="text-sm font-medium mr-2 p-3 rounded-sm bg-gray-600 text-gray-300 inline-flex items-center h-full"
                v-if="instance?.versions?.neoForge">
            <img src="../../../assets/neoforge_logo.png" class="w-4 h-4 mr-1.5" alt="NeoForge logo" />
            <span class="text-white font-medium text-xs">NeoForge version {{ instance.versions.neoForge.name.replace('neoforge-', '') }}</span>
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
            <modal-base ref="modalUpdateAvailable"
                        :id="'modal-1'"
                        :promise="() => s.createEvent(() => update(), () => isUpdateNeeded = false)"
                        :cancel-callback="() => isUpdateNeeded = false"
                        cancel-message="No, just ignore"
                        alert-message="An update is available, would you like to download it ?">
            </modal-base>
            <button type="button" class="secondary px-5 py-2.5 space-x-2"
                    v-on:click="modalUpdateAvailable?.openCloseModal()">
              <span>Update available</span>
              <font-awesome-icon :icon="['fas', 'circle-arrow-up']" beat />
            </button>
          </EventWrapper>
          <EventWrapper :listener="listener" :disable-state-change="true" v-else>
            <template #default="s">
              <button type="button" class="primary px-5 py-2.5"
                      v-on:click="s.createEvent(() => launchGame(), () => loadingGame = false)" :disabled="loadingGame">
                Play
                <font-awesome-icon v-if="loadingGame" class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'spinner']" spin />
                <font-awesome-icon v-else class="text-white ml-2 w-3.5 h-3.5" :icon="['fas', 'play']" bounce />
              </button>
            </template>
          </EventWrapper>
        </span>
      </div>
    </section>
    <section class="grow">
      <router-view />
    </section>
    <ProgressBar></ProgressBar>
  </InstanceContent>
</template>
