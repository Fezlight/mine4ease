<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {ApiType, getByType, InstanceSettings, Mod, ModLoader} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import {transformDownloadCount} from "../../../shared/utils/Utils";
import BackToLastPage from "../../../shared/components/buttons/BackToLastPage.vue";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";

const route = useRoute();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const mod: Ref<Mod | undefined> = ref();

async function getModDetails(id: string): Promise<Mod | undefined> {
  let gameVersion: string | undefined;
  let modLoader: ModLoader | undefined;
  if (instance?.value) {
    gameVersion = instance.value?.versions.minecraft.name;
    modLoader = instance.value?.modLoader;
  }

  return getByType(ApiType.CURSE).searchItemById(Number(id), gameVersion, modLoader)
    .then(m => mod.value! = m);
}

async function getModDescription(id: string): Promise<string | undefined> {
  return getByType(ApiType.CURSE).getModDescription(Number(id))
  .then(desc => mod.value!.description = desc);
}
</script>
<template>
  <div class="flex flex-col gap-4 mb-4">
    <section class="flex flex-row items-center gap-4 rounded-lg bg-black/30 shadow-md shadow-black/40 p-4">
      <BackToLastPage @back-to-last-page="() => $router.back()"></BackToLastPage>
    </section>
  </div>
  <div class="flex flex-row gap-4">
    <LoadingComponent class="overflow-y-auto min-w-[250px] max-w-[250px]" :promise="() => getModDetails(<string>route.params.id)">
      <template v-slot:loading>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4">
          <div role="status" class="animate-pulse">
            <div class="h-20 rounded-full bg-gray-600 mb-4 w-1/2"></div>
            <div class="h-4 rounded-full bg-gray-600 mb-4"></div>
            <div class="h-3 rounded-full bg-gray-600 mb-4"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600"></div>
          </div>
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4">
          <div role="status" class="animate-pulse">
            <div class="h-3 rounded-full bg-gray-600  mb-4"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
            <div class="h-2 rounded-full bg-gray-600"></div>
          </div>
        </div>
      </template>
      <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4">
        <div class="w-20 h-20">
          <img :src="mod?.iconUrl" :alt="mod?.displayName + ' icon'" class="object-cover rounded-lg">
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
    </LoadingComponent>
    <LoadingComponent class="flex-grow rounded-lg bg-black/30 shadow-md shadow-black/40 p-4" :promise="() => getModDescription(<string>route.params.id)">
      <template v-slot:loading>
        <div role="status" class="animate-pulse">
          <div class="h-8 rounded-full bg-gray-600 mb-4"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-4"></div>
          <div class="h-8 rounded-full bg-gray-600 mb-4"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-4"></div>
          <div class="h-8 rounded-full bg-gray-600 mb-4"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600 mb-2.5"></div>
          <div class="h-2 rounded-full bg-gray-600"></div>
        </div>
      </template>
      <span id="mod-description" v-html="mod?.description"></span>
    </LoadingComponent>
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
