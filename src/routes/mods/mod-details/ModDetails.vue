<script setup lang="ts">
import {inject, Ref, ref} from "vue";
import {ApiType, getByType, InstanceSettings, Mod, ModLoader} from "mine4ease-ipc-api";
import {useRoute} from "vue-router";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import BottomNavBar from "../../../shared/components/bottom-nav-bar/BottomNavBar.vue";
import {transformDownloadCount} from "../../../shared/utils/Utils";

const route = useRoute();
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');
const mod: Ref<Mod | undefined> = ref();
const description: Ref<string | undefined> = ref();
const apiType = ApiType.CURSE;

async function getModDetails(id: string): Promise<Mod | undefined> {
  if (!instance?.value) {
    return Promise.reject();
  }
  let gameVersion: string = instance.value.versions.minecraft.name;
  let modLoader: ModLoader | undefined = instance.value.modLoader;

  return getByType(apiType).getItemById(Number(id), new Mod(), gameVersion, modLoader)
  .then(m => mod.value! = m);
}

async function getModDescription(id: string): Promise<string | undefined> {
  return getByType(apiType).getModDescription(Number(id))
  .then(desc => description.value = desc)
  .then(desc => {
    eventListeners();
    return desc;
  });
}

function eventListeners() {
  let spoiler = document.getElementsByClassName("spoiler");
  for (var i = 0; i < spoiler.length; i++) {
    spoiler[i].addEventListener("click", () => {
      spoiler[i].classList.toggle("shown");
      console.log("test")
    }, false);
  }
}
</script>
<template>
  <InstanceContent :fluid="true">
    <div class="grid grid-cols-[250px_1fr] gap-4 p-6">
      <LoadingComponent class="overflow-y-auto" :promise="() => getModDetails(<string>route.params.id)" :execute-automation="true">
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
          <a :href="mod?.links?.websiteUrl" target="_blank">See on CurseForge&nbsp
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" />
          </a>
        </div>
        <div class="flex flex-col rounded-lg bg-black/30 shadow-md shadow-black/40 p-4 gap-4"
             v-if="mod?.links?.sourceUrl || mod?.links?.wikiUrl || mod?.links?.websiteUrl">
          <h3>External links</h3>
          <span v-if="mod?.links?.wikiUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'book']" />
            <a :href="mod.links.wikiUrl">Wiki</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3" />
          </span>
          <span v-if="mod?.links?.sourceUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'code']" />
            <a :href="mod.links.sourceUrl">Source</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3" />
          </span>
          <span v-if="mod.links.websiteUrl" class="flex flex-row items-center gap-2">
            <font-awesome-icon :icon="['fas', 'globe']" />
            <a :href="mod.links.websiteUrl">Website</a>
            <font-awesome-icon :icon="['fas', 'arrow-up-right-from-square']" class="w-3" />
          </span>
        </div>
      </LoadingComponent>
      <LoadingComponent class="rounded-lg bg-black/30 shadow-md shadow-black/40 p-4" :promise="() => getModDescription(<string>route.params.id)" :execute-automation="true">
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

  .spoiler {
    max-height: 20px;
    overflow: hidden;
    margin: 20px 0;
    transition: max-height .5s linear;
    pointer-events: none;
  }

  .spoiler:before {
    content: "Show spoiler";
    color: #f16436;
    display: block;
    height: 20px;
    width: 120px;
    padding-right: 24px;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.6247 13.7809C10.2594 14.073 9.74049 14.073 9.37527 13.7809L4.37527 9.78087C3.94401 9.43586 3.87408 8.80657 4.21909 8.37531C4.5641 7.94404 5.1934 7.87412 5.62466 8.21913L9.99996 11.7194L14.3753 8.21913C14.8065 7.87412 15.4358 7.94404 15.7808 8.37531C16.1258 8.80657 16.0559 9.43586 15.6247 9.78087L10.6247 13.7809Z' fill='%23F16436'/%3E%3C/svg%3E%0A");
    background-position: 100%;
    background-repeat: no-repeat;
    cursor: pointer;
    margin-bottom: 20px;
  }

  .spoiler.shown {
    max-height: fit-content;
  }

  + * {
    @apply flex flex-col space-y-4 max-w-screen-lg;
  }

  h2, h3, h4 {
    margin: 1rem 0;
  }

  img {
    height: auto;
    display: inline;
    vertical-align: top;
    max-width: 100%;
  }

  pre {
    white-space: pre-wrap;
    margin-bottom: 1rem;
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
