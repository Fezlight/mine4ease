<script setup lang="ts">
import {Category, Mod} from "mine4ease-ipc-api";
import {Transitions} from "../../models/Transitions";
import {redirect, transformDownloadCount} from "../../utils/Utils";

const props = defineProps<{
  mod: Mod
}>();

const emit = defineEmits<{
  (redirect: string, transition: Transitions): void
}>();

function uniqueCat(): IterableIterator<Category> {
  let cat = new Map<number, Category>();
  props.mod.categories?.forEach((c: Category) =>  {
    if(!cat.has(c.id)) {
      cat.set(c.id, c);
    }
  })
  return cat.values();
}
</script>
<template>
  <article class="rounded-lg bg-black/30 shadow-md shadow-black/40">
    <div class="flex flex-row gap-4 px-4 py-5">
      <button @click="redirect({path: `/mods/${mod.id}`}, emit)" class="w-[96px] h-[96px]">
        <img :src="mod.iconUrl" :alt="mod.displayName + ' icon'" class="object-cover">
      </button>
      <div class="flex flex-col justify-between flex-grow max-w-xl xl:max-w-none">
        <h3 class="truncate">{{ mod.displayName }} <span class="text-gray-400 text-sm">by {{mod.authors?.map(a => a.name).join(', ')}}</span></h3>
        <p class="text-sm">{{ mod.summary }}</p>
        <span class="inline-block space-x-2">
          <font-awesome-icon :icon="['fas', 'download']" />
          <span>{{ transformDownloadCount(mod?.downloadCount) }}</span>
        </span>
      </div>
      <div class="flex items-center justify-end flex-grow gap-2">
        <slot></slot>
      </div>
    </div>
    <div class="border-b-2 border-amber-400"></div>
    <div class="flex flex-row gap-4 px-4 py-5">
      <div class="justify-self-start flex flex-row items-center gap-2 justify-between" v-for="categorie in uniqueCat()" :key="categorie.id">
        <img :src="categorie.iconUrl" :alt="categorie.name + ' icon'" class="w-7 h-7">
        <span class="text-sm">{{categorie.name}}</span>
      </div>
    </div>
  </article>
</template>
