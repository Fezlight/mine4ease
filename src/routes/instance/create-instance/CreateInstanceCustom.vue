<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {ApiType, getByType, IInstanceService, Instance, ModLoader, Version} from "mine4ease-ipc-api";
import InstanceIcon from "../../../shared/components/instance/InstanceIcon.vue";
import ModLoaderVersionsList from "../../../shared/components/ModLoaderVersionsList.vue";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import BackToLastPage from "../../../shared/components/buttons/BackToLastPage.vue";

const $instanceService: IInstanceService | undefined = inject('instanceService');

const minecraftVersions: Ref<Version[] | undefined> = ref();
const selectedModLoader: Ref<ModLoader | undefined> = ref();
const icon = ref();

const instance: Ref<any> = ref({
  id: "",
  title: "",
  versions: {
    minecraft: {
      name: ""
    }
  },
  apiType: ApiType.MINE4EASE,
  iconName: "",
  installSide: "client"
});

const emit = defineEmits<(e: 'createInstance', instance: Instance) => void>();

getByType(ApiType.CURSE)?.searchVersions().then(mv => {
  minecraftVersions.value = mv;

  instance.value.versions.minecraft = mv[0];
});

function createInstance() {
  if (selectedModLoader.value) {
    instance.value.modLoader = selectedModLoader.value;
  }
  instance.value.installSide = "client";

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
  if (file) {
    reader.readAsDataURL(file);
    reader.onload = () => {
      icon.value = reader.result;
    }
  }
}
</script>
<template>
  <InstanceContent class="space-y-6">
    <div class="flex flex-row items-center gap-2">
      <BackToLastPage @back-to-last-page="() => $router.back()"></BackToLastPage>
      <h1>Create an instance</h1>
    </div>
    <div class="flex flex-row">
      <form class="flex flex-col items-center gap-6 w-full" @submit="createInstance()">
        <div class="flex flex-col space-y-4 justify-center w-full px-12">
          <div class="flex flex-row gap-4">
            <div class="mt-auto">
              <InstanceIcon @click="sendClickEvent()" :custom-class="!icon ? 'border' : ''">
                <img v-if="icon" :src="icon" alt="Instance icon">
                <font-awesome-icon v-else class="text-2xl text-white" :icon="['fas', 'camera']" />
              </InstanceIcon>
              <input id="instanceIcon" name="instanceIcon" type="file" accept="image/*" @change="loadImage($event)"
                     class="w-full hidden">
            </div>
            <div class="space-y-2 required flex-grow">
              <label for="instanceName">Name</label>
              <input id="instanceName" name="instanceName" type="text" maxlength="30" v-model="instance.title"
                     class="w-full" required>
            </div>
          </div>
          <div class="space-y-2 required">
            <label for="minecraftVersion">Minecraft version</label>
            <select id="minecraftVersion" v-model="instance.versions.minecraft"
                    v-on:change="($refs.modLoaderVersionList as typeof ModLoaderVersionsList).retrieveVersions()" class="w-full" required>
              <option v-for="version of minecraftVersions" :value="version">{{ version.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <h3>ModLoader</h3>
            <ul class="grid w-full gap-6 md:grid-cols-3 xl:grid-cols-4">
              <li>
                <input type="radio" id="forge" name="modloaders" value="Forge"
                       class="hidden peer" v-model="selectedModLoader"
                       v-on:change="($refs.modLoaderVersionList as typeof ModLoaderVersionsList).retrieveVersions(ModLoader.FORGE)">
                <label for="forge" class="inline-flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <span class="w-5">
                    <img src="../../../assets/forge_logo.ico" alt="Forge logo">
                  </span>
                  <span class="w-full text-lg font-semibold">Forge</span>
                </label>
              </li>
              <li>
                <input type="radio" id="fabric" name="modloaders" value="Fabric"
                       class="hidden peer" v-model="selectedModLoader" disabled
                       v-on:change="($refs.modLoaderVersionList as typeof ModLoaderVersionsList).retrieveVersions(ModLoader.FABRIC)">
                <label for="fabric" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700 peer-disabled:bg-gray-700/30 peer-disabled:text-gray-600">
                  <span class="w-5">
                    <img src="../../../assets/fabric_logo.png" alt="Fabric logo">
                  </span>
                  <span class="w-full text-lg font-semibold">Fabric</span>
                </label>
              </li>
              <li>
                <input type="radio" id="quilt" name="modloaders" value="Quilt"
                       class="hidden peer" v-model="selectedModLoader" disabled
                       v-on:change="($refs.modLoaderVersionList as typeof ModLoaderVersionsList).retrieveVersions(ModLoader.QUILT)">
                <label for="quilt" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer group-hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700 peer-disabled:bg-gray-700/30 peer-disabled:text-gray-600">
                  <span class="w-5">
                    <img src="../../../assets/quilt_logo.svg" alt="Quilt logo">
                  </span>
                  <span class="w-full text-lg font-semibold">Quilt</span>
                </label>
              </li>
              <li>
                <input type="radio" id="vanilla" name="modloaders" class="hidden peer"
                       v-on:change="selectedModLoader = undefined">
                <label for="vanilla" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <span class="w-5">
                    <img src="../../../assets/minecraft_logo.ico" alt="vanilla minecraft logo">
                  </span>
                  <span class="w-full text-lg font-semibold">Vanilla</span>
                </label>
              </li>
            </ul>
          </div>
          <ModLoaderVersionsList :mod-loader="selectedModLoader" ref="modLoaderVersionList"
                                 :game-version="instance.versions.minecraft"
                                 v-on:selectVersion="selectVersion" />
        </div>
        <div class="flex flex-row items-center justify-center gap-2">
          <button type="submit" class="primary">
            Create instance
            <svg class="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  </InstanceContent>
</template>
