<script setup lang="ts">
import {ApiService, ModLoader, Version} from "mine4ease-ipc-api";
import {inject, ref} from "vue";

const $apiService: ApiService | undefined = inject('apiService');

const props = defineProps<{
  modLoader: ModLoader | undefined,
  gameVersion: Version
}>();

const emit = defineEmits<{
  (e: 'selectVersion', version: Version): void
}>();

const modloaderVersions = ref<Version[]>();
const selectedVersion = ref<Version>();
const title = ref<string>();

function retrieveVersions(modLoader: ModLoader = props.modLoader) {
  modloaderVersions.value = [];

  $apiService?.searchVersions(props.gameVersion.name, modLoader).then(mlVersions => {
    modloaderVersions.value = mlVersions;

    if(!mlVersions) return;

    switch (modLoader) {
      case ModLoader.FORGE:
        selectVersion(mlVersions.filter(mlVersion => mlVersion.recommended)[0]);
        break;
      case ModLoader.FABRIC:
      case ModLoader.QUILT:
        selectVersion(mlVersions[0]);
        break;
    }
  })

  title.value = modLoader;
}

defineExpose({
  retrieveVersions
})

function selectVersion(version: Version) {
  selectedVersion.value = version;
  emit('selectVersion', version);
}
</script>

<template>
  <div class="space-y-2" v-if="modLoader != null">
    <label for="version">{{title}} version</label>
    <select id="version" class="w-full" v-model="selectedVersion">
      <option v-for="version of modloaderVersions" :value="version" :selected="version.recommended">
        {{ version.name }} {{ version.recommended ? '<RECOMMENDED>' : ''}}
      </option>
    </select>
  </div>
</template>
