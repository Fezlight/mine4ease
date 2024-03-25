<script setup lang="ts">
import {inject, Ref, ref, watchEffect} from "vue";
import {ApiService, InstanceSettings, Mod, ModLoader} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import {transformDownloadCount} from "../../../shared/utils/Utils";

const route = useRoute();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const $apiService: ApiService | undefined = inject('apiService');
const mod: Ref<Mod | undefined> = ref();

async function getModDetails(id: string): Promise<Mod> {
  let gameVersion: string | undefined;
  let modLoader: ModLoader | undefined;
  if (instance?.value) {
    gameVersion = instance.value?.versions.minecraft.name;
    modLoader = instance.value?.modLoader;
  }

  return $apiService?.searchItemById(id, gameVersion, modLoader)
    .then(m => mod.value! = m);
}

async function getModDescription(id: string): Promise<string> {
  return $apiService?.getModDescription(id)
  .then(desc => mod.value!.description = desc);
}

watchEffect(() => {
  if (route.params.id) {
    getModDetails(<string>route.params.id)
      .then(() => getModDescription(<string>route.params.id));
  }
})

</script>
<template>
  <div class="flex flex-col gap-4 mb-4">
    <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 shadow-md shadow-black/40 p-4">
      <button @click="$router.back()" class="text-2xl bg-transparent">
        <font-awesome-icon :icon="['fas', 'arrow-left']" class="flex" />
      </button>
    </section>
  </div>
  <div class="flex flex-row gap-4">
    <section class="overflow-y-auto min-w-[250px] max-w-[250px]">
      <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4">
        <div class="w-20 h-20">
          <img v-bind:src="mod?.iconUrl" v-bind:alt="mod?.displayName + ' icon'" class="object-cover rounded-lg">
        </div>
        <h3>{{ mod?.displayName }}</h3>
        <p class="text-sm">{{ mod?.summary }}</p>
        <span class="text-gray-400 text-sm">by {{ mod?.authors?.map(a => a.name).join(', ') }}</span>
        <div class="border-t-2 border-amber-400"></div>
        <span class="inline-block space-x-2">
          <font-awesome-icon :icon="['fas', 'download']" />
          <span>{{ transformDownloadCount(mod?.downloadCount) }}</span>
        </span>
        <div class="border-t-2 border-amber-400"></div>
        <a :href="mod?.links?.websiteUrl" target="_blank">See on CurseForge&nbsp<font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" /></a>
      </div>
      <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4">
        <h3>External links</h3>
        <span v-if="mod?.links?.wikiUrl" class="flex flex-row items-center gap-2">
          <font-awesome-icon :icon="['fas', 'book']" />
          <a :href="mod?.links.wikiUrl">Wiki</a>
          <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3"/></span>
        <span v-if="mod?.links?.sourceUrl" class="flex flex-row items-center gap-2">
          <font-awesome-icon :icon="['fas', 'code']" />
          <a :href="mod?.links.sourceUrl">Source</a>
          <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3"/></span>
      </div>
    </section>
    <section class="flex-grow rounded-lg bg-black/30 shadow-md shadow-black/40 p-4">
      <span id="mod-description" v-html="mod?.description"></span>
    </section>
  </div>
</template>
<style>
#mod-description {
  position: relative;
  overflow-wrap: break-word;
  word-break: break-word;
  backface-visibility: hidden;
  p {
    margin-bottom: 1rem;
    line-height: 1.45;
  }
  a {
    text-decoration: underline;
  }
  + * {
    @apply space-y-4;
  }
  h2, h3, h4 {
    margin: 1rem 0;
  }
  img {
    display: unset;
  }
  code {
    background-color: #262626;
    display: inline-block;
    vertical-align: middle;
    white-space: pre-wrap;
    overflow: auto;
    padding: 2px 4px;
    border: 1px solid #4d4d4d;
  }
  ul {
    @apply list-none relative left-4 list-inside mb-2;
    li {
      @apply list-disc list-inside;
    }
  }
  ol {
    @apply list-decimal;
    li {
      @apply list-decimal list-inside;
    }
  }

}
</style>
