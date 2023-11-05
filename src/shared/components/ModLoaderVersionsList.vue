<script setup lang="ts">
import {ModLoader, Version} from "mine4ease-ipc-api";

defineProps<{
  modLoader: ModLoader,
  selectedVersion: Version,
  modloaderVersions: Version[]
}>()
</script>

<template>
  <div class="space-y-2">
    <label for="version">{{modLoader}} version</label>
    <select id="version" v-model="selectedVersion"  class="w-full">
      <option v-for="version of modloaderVersions" :value="version" :selected="version.recommended">
        {{ version.name }} {{ version.recommended ? '<RECOMMENDED>' : ''}}
      </option>
    </select>
  </div>
</template>
