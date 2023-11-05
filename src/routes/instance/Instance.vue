<script lang="ts">
import {Instance} from "../../shared/models/Instance";
import {Ref, ref} from "vue";
import Tile from "../../shared/components/Tile.vue";
import {Settings} from "../../shared/models/Settings";

export default {
  components: {Tile},
  props: {
    id: { type: String, required: true },
  },
  setup() {
    const instance: Ref<Instance | undefined> = ref();
    const instances: Ref<Instance[] | undefined> = ref();

    return { instance, instances }
  },
  methods: {
    async readInstances() {
      const data = await window.ipcRenderer.invoke('readFile', 'instances.json');
      return JSON.parse(data);
    },
    searchModPackById(id: string) {
      return this.instances?.filter(modpack => modpack.id === id)[0];
    }
  },
  beforeUpdate() {
    this.instance = this.searchModPackById(this.id);
  },
  updated() {
    this.instance = this.searchModPackById(this.id);
  },
  mounted() {
    this.readInstances().then((data: Settings) => {
      this.instances = data.instances;
      this.instance = this.searchModPackById(this.id);
    });
  }
}
</script>
<template>
  <div class="w-full flex flex-col gap-6">
    <h1 v-if="instance?.title">{{ instance?.title }}
      <span class="text-xs" v-if="instance?.versions?.self">
        v{{ instance?.versions?.self }}
      </span>
    </h1>
    <span class="inline-flex items-center gap-2 h-[20px]">
      <span class="text-sm font-medium mr-2 p-3 rounded bg-green-900 text-green-300 inline-flex items-center h-full" v-if="instance?.versions?.minecraft">
        <img src="../../assets/minecraft_logo.ico" class="w-4 h-4 mr-1.5" alt="Minecraft logo" />
        <span class="text-white font-medium text-xs">Minecraft version {{ instance?.versions?.minecraft }}</span>
      </span>
      <span class="text-sm font-medium mr-2 p-3 rounded bg-gray-900 text-gray-300 inline-flex items-center h-full" v-if="instance?.versions?.forge">
        <img src="../../assets/forge_logo.ico" class="w-4 h-4 mr-1.5" alt="Forge logo" />
        <span class="text-white font-medium text-xs">Forge version {{ instance?.versions?.forge }}</span>
      </span>
      <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full" v-if="instance?.versions?.fabric">
        <img src="../../assets/fabric_logo.png" class="w-4 h-4 mr-1.5" alt="Fabric logo" />
        <span class="text-white font-medium text-xs">Fabric version {{ instance?.versions?.fabric }}</span>
      </span>
      <span class="text-sm font-medium mr-2 p-3 rounded bg-orange-900 text-orange-300 inline-flex items-center h-full" v-if="instance?.versions?.quilt">
        <img src="../../assets/quilt_logo.svg" class="w-4 h-4 mr-1.5" alt="Quilt logo" />
        <span class="text-white font-medium text-xs">Quilt version {{ instance?.versions?.quilt }}</span>
      </span>
    </span>
    <span class="border-t-2 border-gray-700/30"></span>
    <div class="grid grid-cols-3 xl:grid-cols-6 gap-3">
      <Tile title="Mods" subtitle="You have X mods installed" button-title="Manage mods"></Tile>
      <Tile title="Shaders" subtitle="You have X shaders installed" button-title="Manage shaders"></Tile>
      <Tile title="Resource Packs"
            subtitle="You have X resources packs installed"
            button-title="Manage resource packs"></Tile>
    </div>
  </div>
</template>
