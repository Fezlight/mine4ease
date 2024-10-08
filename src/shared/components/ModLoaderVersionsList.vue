<script setup lang="ts">
import {getByType, ApiType, ModLoader, Version} from "mine4ease-ipc-api";
import {ref} from "vue";

const props = defineProps<{
  modLoader: ModLoader | undefined,
  gameVersion: Version
}>();

const emit = defineEmits<{
  (e: 'selectVersion', version: Version): void
}>();

const modloaderVersions = ref<Version[]>();
const selectedVersion = ref<Version | undefined>();
const title = ref<string>();

function retrieveVersions(modLoader: ModLoader | undefined = props.modLoader) {
  modloaderVersions.value = [];
  selectedVersion.value = undefined;

  getByType(ApiType.CURSE).searchVersions(props.gameVersion.name, modLoader).then(mlVersions => {
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
  <div class="space-y-2" v-if="modLoader">
    <label for="version">{{ title }} version</label>
    <select id="version" class="w-full" v-model="selectedVersion">
      <option v-show="modloaderVersions?.length == 0" disabled :value="undefined">No {{ title }} version available</option>
      <option v-for="version of modloaderVersions" :value="version" :selected="version.recommended">
        {{ version.name }} {{ version.recommended ? "<RECOMMENDED>" : ''}}
      </option>
    </select>
  </div>
</template>
