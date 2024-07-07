<script setup lang="ts">
import {redirect, transformDownloadCount} from "../../utils/Utils.ts";
import {ApiType, Category, ModPack} from "mine4ease-ipc-api";
import {Transitions} from "../../models/Transitions";
import {inject} from "vue";

const $apiType: ApiType | undefined = inject('apiType');
const props = defineProps<{
  modpack: ModPack
}>();

const emit = defineEmits<{
  (redirect: string, transition: Transitions): void
}>();

function uniqueCat(): IterableIterator<Category> {
  let cat = new Map<number, Category>();
  props.modpack.categories?.forEach((c: Category) =>  {
    if (!cat.has(c.id)) {
      cat.set(c.id, c);
    }
  })
  return cat.values();
}

</script>
<template>
  <article class="rounded-lg bg-black/30 shadow-md shadow-black/40">
    <div class="grid grid-cols-[96px_3fr_1fr] gap-4 px-4 py-5">
      <button @click="redirect({path: `/modpacks/${$apiType?.toLowerCase()}/${modpack.id}`}, emit)" class="w-[96px] h-[96px]">
        <img :src="modpack.iconUrl" :alt="modpack.displayName + ' icon'" class="object-cover">
      </button>
      <div class="flex flex-col space-y-2 max-w-lg xl:max-w-screen-2xl">
        <h3 class="truncate">{{ modpack.displayName }} <span class="text-gray-400 text-sm">by {{modpack.authors?.map(a => a.name).join(', ')}}</span></h3>
        <p class="text-sm">{{ modpack.summary }}</p>
        <span class="inline-block space-x-2" v-if="modpack?.downloadCount">
          <font-awesome-icon :icon="['fas', 'download']" />
          <span>{{ transformDownloadCount(modpack?.downloadCount) }}</span>
        </span>
      </div>
      <div class="flex items-center justify-end flex-grow gap-2">
        <slot></slot>
      </div>
    </div>
    <div class="border-b-2 border-amber-400"></div>
    <div class="flex flex-row gap-4 px-4 py-5">
      <div class="justify-self-start flex flex-row items-center gap-2 justify-between" v-for="categorie in uniqueCat()" :key="categorie.id">
        <img v-if="categorie.iconUrl" :src="categorie.iconUrl" :alt="categorie.name + ' icon'" class="w-7 h-7">
        <span class="text-sm">{{categorie.name}}</span>
      </div>
    </div>
  </article>
</template>
