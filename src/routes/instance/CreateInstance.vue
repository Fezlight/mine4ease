<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {v4 as uuidv4} from 'uuid';
import InstanceCard from "../../shared/components/InstanceCard.vue";
import {ApiService, Instance, InstanceService, InstanceSettings, ModLoader, Version} from "mine4ease-ipc-api";
import InstanceIcon from "../../shared/components/InstanceIcon.vue";
import ModLoaderVersionsList from "../../shared/components/ModLoaderVersionsList.vue";

const $apiService: ApiService | undefined = inject('apiService');
const $instanceService: InstanceService | undefined = inject('instanceService');

const minecraftVersions: Ref<Version[] | undefined> = ref();
const selectedModLoader: Ref<ModLoader | undefined> = ref();
const modpackId = ref();
const icon = ref();

const instance: Ref<InstanceSettings> = ref({
  id: "",
  title: "",
  versions: {
    minecraft: {
      name: ""
    }
  },
  iconName: ""
});

const emit = defineEmits<(e: 'createInstance', instance: Instance) => void>();

$apiService?.searchVersions().then(mv => {
  minecraftVersions.value = mv;

  instance.value.versions.minecraft = mv[0];
});

function createInstance() {
  if(selectedModLoader.value) {
    instance.value.modLoader = selectedModLoader.value;
  }

  $instanceService?.createInstance(instance.value).then(i => {
    emit("createInstance", i);
  });
}
function sendClickEvent() {
  document.getElementById('instanceIcon')?.click();
}

function selectVersion(version: Version) {
  instance.value.versions = {
    minecraft: instance.value.versions.minecraft
  };
  switch (selectedModLoader.value) {
    case ModLoader.FORGE:
      instance.value.versions.forge = version;
      break;
    case ModLoader.FABRIC:
      instance.value.versions.fabric = version;
      break;
    case ModLoader.QUILT:
      instance.value.versions.quilt = version;
      break;
  }
}
async function loadImage(e: any) {
  const file = e.target.files[0];
  instance.value.iconName = file.path;

  const reader = new FileReader();
  if(file) {
    reader.readAsDataURL(file);
    reader.onload = () => {
      icon.value = reader.result;
    }
  }
}

let isLoading = ref(false);
let modpackS = ref();
function searchModpack() {
  isLoading.value = true;
  modpackS.value = null;
  setTimeout(() => {
    isLoading.value = false;
    modpackS.value = {
      ...instance.value,
      id: uuidv4()
    };
  }, 5000);
}

</script>

<template>
  <div class="space-y-6">
    <h1>Create an instance</h1>
    <div class="flex flex-row">
      <form class="flex flex-col items-center gap-6 w-full" @submit="createInstance()">
        <div class="flex flex-col space-y-4 justify-center w-full px-12">
          <div class="flex flex-row gap-4">
            <div class="mt-auto">
              <InstanceIcon @click="sendClickEvent()" v-bind:custom-class="!icon ? 'border' : ''">
                <img v-if="icon" :src="icon" alt="Instance icon">
                <font-awesome-icon v-else class="text-2xl text-white" :icon="['fas', 'camera']" />
              </InstanceIcon>
              <input id="instanceIcon" name="instanceIcon" type="file" accept="image/*" @change="loadImage($event)" class="w-full hidden">
            </div>
            <div class="space-y-2 required flex-grow">
              <label for="instanceName">Name</label>
              <input id="instanceName" name="instanceName" type="text" maxlength="30" v-model="instance.title" class="w-full" required>
            </div>
          </div>

          <div class="space-y-2 required">
            <label for="minecraftVersion">Minecraft version</label>
            <select id="minecraftVersion" v-model="instance.versions.minecraft" v-on:change="$refs.modLoaderVersionList.retrieveVersions()" class="w-full" required>
              <option v-for="version of minecraftVersions" :value="version">{{ version.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <h3>ModLoader</h3>
            <ul class="grid w-full gap-6 md:grid-cols-3 xl:grid-cols-4">
              <li>
                <input type="radio" id="forge" name="modloaders" value="Forge" class="hidden peer" v-model="selectedModLoader" v-on:change="$refs.modLoaderVersionList.retrieveVersions(ModLoader.FORGE)">
                <label for="forge" class="inline-flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/forge_logo.ico" alt="Forge logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Forge</div>
                </label>
              </li>
              <li>
                <input type="radio" id="fabric" name="modloaders" value="Fabric" class="hidden peer" v-model="selectedModLoader" v-on:change="$refs.modLoaderVersionList.retrieveVersions(ModLoader.FABRIC)">
                <label for="fabric" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/fabric_logo.png" alt="Fabric logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Fabric</div>
                </label>
              </li>
              <li>
                <input type="radio" id="quilt" name="modloaders" value="Quilt" class="hidden peer" v-model="selectedModLoader" v-on:change="$refs.modLoaderVersionList.retrieveVersions(ModLoader.QUILT)">
                <label for="quilt" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/quilt_logo.svg" alt="Quilt logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Quilt</div>
                </label>
              </li>
              <li>
                <input type="radio" id="vanilla" name="modloaders" class="hidden peer" v-on:change="selectedModLoader = undefined">
                <label for="vanilla" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/minecraft_logo.ico" alt="vanilla minecraft logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Vanilla</div>
                </label>
              </li>
            </ul>
          </div>

          <ModLoaderVersionsList :mod-loader="selectedModLoader" ref="modLoaderVersionList"
                                 :game-version="instance.versions.minecraft"
                                 v-on:selectVersion="selectVersion"/>
        </div>
        <button type="submit" class="primary">
          Create instance
          <svg class="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
          </svg>
        </button>
      </form>
      <div class="flex flex-col justify-center gap-4">
        <hr class="border-l-2 border-gray-500 -rotate-90">
        <span class="font-medium text-white">OR</span>
        <hr class="border-l-2 border-gray-500 -rotate-90">
      </div>
      <div class="flex flex-col items-center gap-6 w-full">
        <div class="flex flex-col gap-4 justify-center w-full px-12">
          <div class="space-y-2">
            <label for="import_id">Import via id</label>
            <input type="text" id="import_id" placeholder="2c78d17c-d496-41f0-b3b0-bef2c5c234a2" v-on:change="searchModpack()" class="w-full" v-model="modpackId">
          </div>
          <InstanceCard :instance="modpackS" :is-loading="isLoading" v-if="modpackId"></InstanceCard>
        </div>
      </div>
    </div>

  </div>
</template>
