<script setup lang="ts">
import Tile from "../../../../shared/components/Tile.vue";
import {inject, ref, Ref, watchEffect} from "vue";
import {InstanceSettings, Mod} from "mine4ease-ipc-api";

const mods: Ref<Map<string, Mod> | undefined> = ref();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

async function getMods() {
  let modsReq = await fetch(`mine4ease-instance://${instance?.value?.id}/mods`)
  .then(res => res.json())
  .catch(() => undefined);

  mods.value = modsReq?.mods;
}

function isModded() {
  return !!instance?.value?.versions?.fabric
      || !!instance?.value?.versions?.forge
      || !!instance?.value?.versions?.quilt;
}

watchEffect(() => {
  if (isModded()) {
    getMods();
  }
})
</script>
<template>
  <div class="py-4 px-6 h-full" v-if="instance">
    <div class="grid grid-cols-3 gap-3">
      <Tile v-if="isModded()" title="Mods" :subtitle="`You have ${mods ? Object.keys(mods).length : 0} mods installed`"
            button-title="Manage mods"
            @action="$router.push({path: `/instance/${instance.id}/mods`})"></Tile>
      <Tile v-if="isModded()" title="Shaders" subtitle="You have ?? shaders installed"
            :disabled="true"
            button-title="Manage shaders"
            @action="$router.push({path: `/instance/${instance.id}/shaders`})"></Tile>
      <Tile title="Resource Packs" subtitle="You have ?? resources packs installed"
            :disabled="true"
            button-title="Manage resource packs"
            @action="$router.push({path: `/instance/${instance.id}/resource-packs`})"></Tile>
    </div>
  </div>
</template>
