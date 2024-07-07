<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {ApiType, getByType, InstanceSettings, ModLoader, ModPack} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import {transformDownloadCount} from "../../../shared/utils/Utils";
import BottomNavBar from "../../../shared/components/bottom-nav-bar/BottomNavBar.vue";
import {Links} from "../../../../mine4ease-ipc-api";

const route = useRoute();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const apiType: ApiType = ApiType.CURSE;
const modpack: Ref<ModPack | undefined> = ref();
const description: Ref<string | undefined> = ref();

async function getModDetails(id: string): Promise<ModPack> {
  if (!instance?.value) {
    return Promise.reject();
  }
  let gameVersion: string = instance.value.versions.minecraft.name;
  let modLoader: ModLoader | undefined = instance.value.modLoader;

  return getByType(apiType).getItemById(Number(id), new ModPack(), gameVersion, modLoader)
  .then(m => {
    modpack.value! = m;
    return m;
  });
}

async function getModDescription(id: string): Promise<string | undefined> {
  return getByType(apiType).getModDescription(Number(id))
    .then(desc => description.value = desc)
    .catch(() => description.value = modpack.value?.description);
}
</script>
<template>
  <InstanceContent>
    <div class="flex flex-row gap-4">
      <LoadingComponent class="overflow-y-auto min-w-[250px] max-w-[250px]" :promise="() => getModDetails(<string>route.params.id)" :execute-automation="true">
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
            <img :src="modpack?.iconUrl" :alt="modpack?.displayName + ' icon'" class="object-cover rounded-lg">
          </div>
          <h3>{{ modpack?.displayName }}</h3>
          <p class="text-sm">{{ modpack?.summary }}</p>
          <span class="text-gray-400 text-sm">by {{ modpack?.authors?.map(a => a.name).join(', ') }}</span>
          <div class="border-t-2 border-amber-400"></div>
          <span class="inline-block space-x-2">
            <font-awesome-icon :icon="['fas', 'download']" />
            <span>{{ transformDownloadCount(modpack?.downloadCount) }}</span>
          </span>
          <div class="border-t-2 border-amber-400"></div>
          <a :href="(<Links>modpack?.links)?.websiteUrl" target="_blank">See on CurseForge&nbsp<font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" /></a>
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4"
             v-if="(<Links>modpack?.links)?.sourceUrl || (<Links>modpack?.links)?.wikiUrl || (<Links>modpack?.links)?.websiteUrl">
          <h3>External links</h3>
          <span v-if="(<Links>modpack?.links).wikiUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'book']" />
            <a :href="(<Links>modpack?.links).wikiUrl">Wiki</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3"/>
          </span>
          <span v-if="(<Links>modpack?.links).sourceUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'code']" />
            <a :href="(<Links>modpack?.links).sourceUrl">Source</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3"/>
          </span>
          <span v-if="(<Links>modpack?.links).websiteUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'globe']" />
            <a :href="(<Links>modpack?.links).websiteUrl">Website</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3"/>
          </span>
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4">
          <h3>Latest versions</h3>
          <ol class="list-disc list-inside">
            <li v-for="version in modpack?.gameVersions">
              {{version}}
            </li>
          </ol>
        </div>
      </LoadingComponent>
      <LoadingComponent class="flex-grow rounded-lg bg-black/30 shadow-md shadow-black/40 p-4" :promise="() => getModDescription(<string>route.params.id)" :execute-automation="true">
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
        <span id="mod-description" v-html="description"></span>
      </LoadingComponent>
    </div>
    <bottom-nav-bar @backToLastPage="() => $router.back()" max-size-class="max-w-min"></bottom-nav-bar>
  </InstanceContent>
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
