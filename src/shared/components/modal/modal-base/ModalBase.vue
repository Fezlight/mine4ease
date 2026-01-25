<script setup lang="ts">
import {ref} from "vue";

const props = defineProps<{
  id: string,
  promise: () => Promise<any>,
  cancelCallback?: Function
  alertMessage: string,
  okMessage?: string,
  cancelMessage?: string
}>();

defineExpose({
  openCloseModal
})

const hidden = ref(true);
const okMessage = ref(props.okMessage ?? "Yes, I'm sure");
const cancelMessage = ref(props.cancelMessage ?? "No, cancel");

function openCloseModal() {
  hidden.value = !hidden.value
}

function closeModal() {
  hidden.value = false;
  if (props.cancelCallback) {
    props?.cancelCallback();
  }
}
</script>
<template>
  <div :id="id" tabindex="-1" v-bind:class="hidden ? 'hidden' : ''" class="overflow-y-auto overflow-x-hidden fixed z-100 flex justify-center items-center w-full md:inset-0 max-h-full">
    <div class="w-full max-w-md max-h-full bg-gray-800 border-2 border-gray-700/30 rounded-lg shadow-lg">
      <div class="relative bg-black/30 rounded-lg">
        <button type="button"
                class="absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                v-on:click="closeModal()">
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
          </svg>
          <span class="sr-only">Close modal</span>
        </button>
        <div class="p-4 md:p-5 text-center">
          <svg class="mx-auto mb-4 w-12 h-12 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h3 class="mb-5 text-lg font-normal text-gray-400">{{alertMessage}}</h3>
          <button type="button"
                  v-on:click="promise().then(() => openCloseModal())"
                  class="danger px-5 py-2.5 space-x-2">
            {{ okMessage }}
          </button>
          <button type="button"
                  v-on:click="closeModal();"
                  class="normal ms-3 px-5 py-2.5 space-x-2">
            {{ cancelMessage }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
