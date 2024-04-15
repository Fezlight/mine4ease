<script setup lang="ts">
import {ref} from "vue";

const isLoading = ref(false);
const isHiding = ref(false);

const props = defineProps<{
  promise: Function,
  executeAutomation?: boolean,
  hideByDefault?: boolean
}>();

isHiding.value = props.hideByDefault;

async function execute() {
  return new Promise((resolve) => {
    isLoading.value = true;
    resolve(null);
  })
  .then(() => props.promise())
  .finally(() => isLoading.value = false);
}

async function executePromise(): Promise<any> {
  if (isLoading.value) {
    return Promise.reject();
  }
  isHiding.value = false;

  return execute();
}

if(props.executeAutomation) {
  executePromise();
}

defineExpose({
  executePromise
});
</script>
<template>
  <div>
    <slot v-if="isLoading" name="loading">
      <div class="flex items-center justify-center h-full text-4xl gap-2">
        <font-awesome-icon :icon="['fas', 'gear']" spin />
      </div>
    </slot>
    <slot v-else-if="!isHiding"></slot>
  </div>
</template>
