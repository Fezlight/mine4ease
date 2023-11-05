<script setup lang="ts">
import InstanceIcon from "../../shared/components/InstanceIcon.vue";
import {Ref, ref} from "vue";
import {Instance} from "../../shared/models/Instance.ts";
import {Settings} from "../../shared/models/Settings";
import {useRouter} from "vue-router";

const modpacks: Ref<Instance[] | undefined> = ref();
const selectedModpack: Ref<Instance | undefined> = ref();

const router = useRouter();

async function readInstances() {
  const data = await window.ipcRenderer.invoke('readFile', 'instances.json');
  return JSON.parse(data);
}

function createModPack() {
  selectedModpack.value = undefined;
  router.push({name: 'instance-create'});
}

function selectModPack(modpack: Instance) {
  selectedModpack.value = modpack;
  router.push({name:'instance', params: {id: modpack.id}});
}

readInstances().then((data: Settings) => {
  modpacks.value = data.instances;
  let selectedModpack = data.instances?.filter(modpack => modpack.id === data.selectedInstance)[0];
  if(selectedModpack) {
    selectModPack(selectedModpack);
  }
});
</script>
<template>
  <div class="flex flex-row">
    <section class="sticky top-[30px] flex flex-col menu-left max-window-height bg-gray-800 w-[70px]">
      <div class="flex flex-col gap-2 p-2 overflow-y-auto">
        <InstanceIcon v-for="modpack in modpacks"
                     @click="selectModPack(modpack)"
                     :class="{ 'active': selectedModpack == modpack }">
          <img src="../../assets/minecraft_logo.svg" class="absolute p-2" alt="Minecraft logo" />
        </InstanceIcon>
        <InstanceIcon @click="createModPack()">
          <font-awesome-icon class="text-2xl text-white" :icon="['fas', 'add']" />
        </InstanceIcon>
      </div>
      <div class="shadow-[-1px_-10px_10px_0px] z-10 shadow-black/50 p-2 rounded-t-md border-t-[1px] border-gray-500/60 flex flex-col justify-center gap-2">
        <button type="button" class="group rounded-lg hover:bg-gray-700/60 flex justify-center">
          <font-awesome-icon class="p-2 text-2xl text-white/80 h-[34px]"
                             :icon="['fas', 'gear']" />
        </button>
        <button type="button" class="group rounded-lg hover:bg-gray-700/60 flex justify-center" @click="router.push('/login')">
          <font-awesome-icon class="p-2 text-2xl text-white/80 h-[34px] group-hover:text-red-700/80"
                             :icon="['fas', 'right-from-bracket']" />
        </button>
      </div>
    </section>
    <section class="flex flex-col bg-black/40 p-8 bg-gray-800 flex-grow max-window-height overflow-y-auto">
      <router-view></router-view>
    </section>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  display: none;
}
.menu-left {
  @apply max-h-screen shadow-xl shadow-black/80 border-r-[1px] border-gray-500/60;
}
.max-window-height {
  height: calc(100vh - 30px);
}
</style>
