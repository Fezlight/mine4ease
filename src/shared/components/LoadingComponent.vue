<script setup lang="ts">
import {ref} from "vue";

const isLoading = ref(false);
const props = defineProps<{
  promise: Function
}>();

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

  return execute();
}

executePromise();

defineExpose({
  executePromise
});
</script>
<template>
  <div>
    <slot v-if="isLoading" name="loading">
      <div class="flex items-center max-window-height justify-center text-4xl gap-2">
        <font-awesome-icon :icon="['fas', 'gear']" spin />
      </div>
    </slot>
    <slot v-else></slot>
  </div>
</template>
