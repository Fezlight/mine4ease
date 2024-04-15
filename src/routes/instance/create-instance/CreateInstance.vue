<script setup lang="ts">
import InstanceCard from "../../../shared/components/instance/InstanceCard.vue";
import {ref} from "vue";
import {v4 as uuidv4} from "uuid";
import InstanceContent from "../../../shared/components/instance/InstanceContent.vue";
import LoadingComponent from "../../../shared/components/LoadingComponent.vue";

const modpackS = ref();
const modpackId = ref();

async function searchModpack() {
  modpackS.value = null;

  return new Promise((resolve) => {
    setTimeout(() => {
      let modpack = {
        id: uuidv4(),
        name: "Test Modpack"
      };
      resolve(modpack);
    }, 5000)
  }).then(modpack => modpackS.value = modpack);
}
</script>
<template>
  <InstanceContent>
    <h1>Create an instance</h1>
    <section class="flex flex-col items-center justify-center gap-6 mx-auto w-1/2 h-full">
      <div class="flex flex-col gap-2">
        <button type="submit" class="primary justify-between" @click="$router.push('/create/custom')">
          <span>Create</span>
          <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
          </svg>
        </button>
        <button type="submit" class="primary justify-between" @click="$router.push('/create/modpack')">
          <span>Browse Curse modpack</span>
          <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
          </svg>
        </button>
      </div>
      <div class="flex flex-row justify-center gap-4">
        <span class="border-l-2 border-gray-500 rotate-90"></span>
        <span class="font-medium text-white">OR</span>
        <span class="border-l-2 border-gray-500 rotate-90"></span>
      </div>
      <div class="flex flex-col items-center gap-6 w-full">
        <div class="flex flex-col gap-4 justify-center w-full">
          <div class="space-y-2">
            <label for="import_id">Import existing Mine4Ease instance</label>
            <input type="text" id="import_id" placeholder="2c78d17c-d496-41f0-b3b0-bef2c5c234a2"
                   v-on:change="($refs.instanceSearch as typeof LoadingComponent).executePromise()" class="w-full" v-model="modpackId">
          </div>
          <LoadingComponent :promise="() => searchModpack()" :execute-automation="false" ref="instanceSearch" class="flex flex-col" :hide-by-default="true">
            <InstanceCard :instance="modpackS"></InstanceCard>
          </LoadingComponent>
        </div>
      </div>
    </section>
  </InstanceContent>
</template>
