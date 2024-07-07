<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {ApiType, getByType, InstanceSettings, Link, ModLoader, ModPack} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import BottomNavBar from "../../../shared/components/bottom-nav-bar/BottomNavBar.vue";
import MarkdownRenderer from "../../../shared/components/MarkdownRenderer.vue";
import {transformDownloadCount} from "../../../shared/utils/Utils";

const route = useRoute();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const apiType: ApiType = ApiType.FEEDTHEBEAST;
const modpack: Ref<ModPack | undefined> = ref();
const description: Ref<string | undefined> = ref();

const modpackDescription: Ref<typeof LoadingComponent | undefined> = ref();

async function getModDetails(id: string): Promise<ModPack> {
  if (!instance?.value) {
    return Promise.reject();
  }
  let gameVersion: string = instance.value.versions.minecraft.name;
  let modLoader: ModLoader | undefined = instance.value.modLoader;

  return getByType(apiType).getItemById(Number(id), new ModPack(), gameVersion, modLoader)
  .then(m => {
    modpack.value! = m;
    description.value = m.description;

    modpackDescription.value?.executePromise();
    return m;
  });
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
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4 mb-4" v-if="(<Link[]>modpack?.links)?.length">
          <h3>External links</h3>
          <span v-for="link in <Link[]>modpack?.links" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'book']" v-if="link.type === 'wiki'"/>
            <font-awesome-icon :icon="['fas', 'code']" v-if="link.type === 'issues'"/>
            <font-awesome-icon :icon="['fas', 'globe']" v-if="link.type === 'website'"/>
            <a :href="link.link">{{ link.name }}</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3" />
          </span>
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4">
          <h3>Latest versions</h3>
          <ol class="list-disc list-inside">
            <li v-for="version in modpack?.gameVersions">
              {{ version }}
            </li>
          </ol>
        </div>
      </LoadingComponent>
      <LoadingComponent class="flex-grow rounded-lg bg-black/30 shadow-md shadow-black/40 p-4" :promise="() => modpack?.description" ref="modpackDescription">
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
        <markdown-renderer id="mod-description" :source="description"></markdown-renderer>
      </LoadingComponent>
    </div>
    <bottom-nav-bar @backToLastPage="() => $router.back()" max-size-class="max-w-min"></bottom-nav-bar>
  </InstanceContent>
</template>
