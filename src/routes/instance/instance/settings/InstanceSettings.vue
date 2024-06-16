<script setup lang="ts">
import BottomNavBar from "../../../../shared/components/bottom-nav-bar/BottomNavBar.vue";
import {inject, Ref} from "vue";
import {InstanceSettings} from "mine4ease-ipc-api";
import {InstanceService} from "../../../../shared/services/InstanceService.ts";
import InstanceSubContent from "../../../../shared/components/instance/InstanceSubContent.vue";

const $instanceService: InstanceService | undefined = inject('instanceService');
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

let memory = {
  '512M': '512 Mo',
  '1G': '1 Go',
  '2G': '2 Go',
  '3G': '3 Go',
  '4G': '4 Go',
  '5G': '5 Go',
  '6G': '6 Go',
  '7G': '7 Go',
  '8G': '8 Go',
  '9G': '9 Go',
  '10G': '10 Go'
};

function save() {
  if (!instance?.value) {
    return;
  }

  $instanceService?.saveInstanceSettings(instance?.value);
}
</script>
<template>
  <InstanceSubContent :fluid="true" v-if="instance">
    <form class="p-6 h-full" @submit="save">
      <div class="mb-6">
        <label for="java_args" class="block mb-2 text-sm font-medium text-white">Java arguments</label>
        <input id="java_args" name="java_args" type="text" class="w-full" v-model="instance.additionalJvmArgs">
      </div>
      <div class="mb-6">
        <label for="memory" class="block mb-2 text-sm font-medium text-white">Memory allocated</label>
        <select id="memory" name="memory" type="text" class="w-full" v-model="instance.memory">
          <option v-for="(k, v) of memory" :value="v">{{ k }}</option>
        </select>
      </div>
      <button type="submit" class="px-5 py-2.5 primary">Save</button>
    </form>
  </InstanceSubContent>
  <bottom-nav-bar @backToLastPage="() => $router.push({path: `/instance/${instance?.id}`})" maxSizeClass="max-w-min"></bottom-nav-bar>
</template>
