<script setup lang="ts">
import {Ref, ref} from "vue";
import {Instance} from "../../shared/models/Instance";
import {v4 as uuidv4} from 'uuid';
import {Settings} from "../../shared/models/Settings";
import {useRouter} from "vue-router";
import modLoaderService from "../../shared/services/ModLoaderService";
import InstanceCard from "../../shared/components/InstanceCard.vue";

const router = useRouter();

let minecraftVersions: Ref<[] | undefined> = ref();
let forgeVersions: Ref<[] | undefined> = ref();
let fabricVersions: Ref<[] | undefined> = ref();
let quiltVersions: Ref<[] | undefined> = ref();

let selectedModLoader = ref();
let modpackId = ref();

const modpack: Ref<Instance> = ref({
  id: "",
  title: "",
  description: "A minecraft modpack especially created for hosting some of the reika's famous mod",
  versions: {
    minecraft: ""
  }
});

modLoaderService.retrieveMinecraftVersion().then(mv => {
  minecraftVersions.value = mv;

  modpack.value.versions.minecraft = mv[0];
});

function retrieveVersions() {
  let modpackVal = modpack.value;

  modpackVal.versions = {
    minecraft: modpackVal.versions.minecraft
  };
  switch (selectedModLoader.value) {
    case 'forge':
      modLoaderService.retrieveForgeVersion(modpackVal.versions.minecraft).then(fv => {
        modpackVal.versions.forge = fv.filter((f: any) => f.recommended)[0].name;
        forgeVersions.value = fv.sort(function(a: any, b: any) {return new Date(b.dateModified) - new Date(a.dateModified)});
      }).catch(() => forgeVersions.value = []);
      break;
    case 'fabric':
      modLoaderService.retrieveFabricVersion(modpackVal.versions.minecraft).then(fv => {
        modpackVal.versions.fabric = fv[0];
        fabricVersions.value = fv
      }).catch(() => fabricVersions.value = []);
      break;
    case 'quilt':
      modLoaderService.retrieveQuiltVersion(modpackVal.versions.minecraft).then(qv => {
        modpackVal.versions.quilt = qv[0];
        quiltVersions.value = qv
      }).catch(() => quiltVersions.value = []);
      break;
  }
}

async function writeModPack(modpack: Instance) {
  const settings: Settings = {
    instances : [modpack]
  };
  await window.ipcRenderer.invoke('saveFile', {data: JSON.stringify(settings), path: "",filename: "instances.json"});
  await window.ipcRenderer.invoke('saveFile', {data: JSON.stringify(settings), path: "modpacks/" + modpack.id,filename: ""});
}

function createModpack() {
  modpack.value.id = uuidv4();
  modpack.value.versions.forge = selectedModLoader.value === 'forge' ? modpack.value.versions.forge?.replace("forge-", "") : undefined;
  modpack.value.versions.fabric = selectedModLoader.value === 'fabric' ? modpack.value.versions.fabric : undefined;
  modpack.value.versions.quilt = selectedModLoader.value === 'quilt' ? modpack.value.versions.quilt : undefined;

  writeModPack(modpack.value);

  router.push({name:'modpack-view', params: {id: modpack.value.id}});
}

let isLoading = ref(false);
let modpackSearch = {
  id: uuidv4(),
  title: "test",
  versions: {
    minecraft: "1.18.2"
  }
};
let modpackS = ref();
function searchModpack(text: string) {
  console.log(text);
  isLoading.value = true;
  modpackS.value = null;
  setTimeout(() => {
    isLoading.value = false;
    modpackS.value = modpackSearch;
  }, 5000);
}

</script>

<template>
  <div class="space-y-6">
    <h1>Create an instance</h1>
    <div class="flex flex-row">
      <form class="flex flex-col items-center gap-6 w-full" @submit="createModpack()">
        <div class="flex flex-col space-y-4 justify-center w-full px-12">
          <div class="space-y-2 required">
            <label for="instanceName">Name</label>
            <input id="instanceName" type="text" maxlength="30" v-model="modpack.title" class="w-full" required>
          </div>

          <div class="space-y-2 required">
            <label for="minecraftVersion">Minecraft version</label>
            <select id="minecraftVersion" v-model="modpack.versions.minecraft" v-on:change="retrieveVersions" class="w-full">
              <option v-for="version of minecraftVersions" :value="version">{{ version }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <h3>ModLoader</h3>
            <ul class="grid w-full gap-6 md:grid-cols-3 xl:grid-cols-4">
              <li>
                <input type="radio" id="forge" name="modloaders" value="forge" class="hidden peer" v-model="selectedModLoader" v-on:change="retrieveVersions">
                <label for="forge" class="inline-flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/forge_logo.ico" alt="Forge logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Forge</div>
                </label>
              </li>
              <li>
                <input type="radio" id="fabric" name="modloaders" value="fabric" class="hidden peer" v-model="selectedModLoader" v-on:change="retrieveVersions">
                <label for="fabric" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/fabric_logo.png" alt="Fabric logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Fabric</div>
                </label>
              </li>
              <li>
                <input type="radio" id="quilt" name="modloaders" value="quilt" class="hidden peer" v-model="selectedModLoader" v-on:change="retrieveVersions">
                <label for="quilt" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/quilt_logo.svg" alt="Quilt logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Quilt</div>
                </label>
              </li>
              <li>
                <input type="radio" id="vanilla" name="modloaders" value="vanilla" class="hidden peer" v-model="selectedModLoader" v-on:change="retrieveVersions">
                <label for="vanilla" class="flex items-center w-full p-3 gap-2 border rounded-lg cursor-pointer hover:text-gray-300 border-gray-700 peer-checked:bg-gray-700 text-white bg-gray-800 hover:bg-gray-700">
                  <div class="w-5">
                    <img src="../../assets/minecraft_logo.ico" alt="vanilla minecraft logo">
                  </div>
                  <div class="w-full text-lg font-semibold">Vanilla</div>
                </label>
              </li>
            </ul>
          </div>

          <div class="space-y-2" v-if="selectedModLoader == 'forge'">
            <label for="forgeVersion">Forge version</label>
            <select id="forgeVersion" v-model="modpack.versions.forge" class="w-full">
              <option v-for="version of forgeVersions" :value="version.name" :selected="version.latest">
                {{ version.name }} {{ version.latest ? '<LATEST>' : '' }} {{ version.recommended ? '<RECOMMENDED>' : ''}}
              </option>
            </select>
          </div>

          <div class="space-y-2" v-if="selectedModLoader == 'fabric'">
            <label for="fabricVersion">Fabric version</label>
            <select id="fabricVersion" v-model="modpack.versions.fabric" class="w-full">
              <option v-for="version of fabricVersions" :value="version">
                {{ version }} {{ version === fabricVersions[0] ? '<LATEST>' : '' }}
              </option>
            </select>
          </div>

          <div class="space-y-2" v-if="selectedModLoader == 'quilt'">
            <label for="quiltVersion">Quilt version</label>
            <select id="quiltVersion" v-model="modpack.versions.quilt" class="w-full">
              <option v-for="version of quiltVersions" :value="version">
                {{ version }} {{ version === quiltVersions[0] ? '<LATEST>' : '' }}
              </option>
            </select>
          </div>
        </div>
        <button type="submit" class="bg-sky-600/60 hover:bg-sky-600/50">
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
            <input type="text" id="import_id" placeholder="2c78d17c-d496-41f0-b3b0-bef2c5c234a2" v-on:change="searchModpack(modpackId)" class="w-full" v-model="modpackId">
          </div>
          <InstanceCard :modpack="modpackS" :is-loading="isLoading" v-if="modpackId"></InstanceCard>
        </div>
      </div>
    </div>

  </div>
</template>
