<script setup lang="ts">
import {useRoute} from "vue-router";
import {inject, Ref, ref} from "vue";
import {InstanceService} from "mine4ease-ipc-api";

const route = useRoute();
const id: Ref<string> = ref(route.query.id as string);

const $instanceService: InstanceService | undefined = inject('instanceService');

const emit = defineEmits<{
  (e: 'deleteInstance', id: string): void,
  (e: 'createInstance', id: string): void
}>();

function deleteInstance(id: string) {
  $instanceService?.deleteInstance(id)
    .then(() => emit('deleteInstance', id));
}


</script>
<template>
  <div class="flex flex-col items-center justify-center h-screen gap-2">
    <h2>Unable to find instance</h2>
    <p>There was an issue when trying to retrieve instance with id : {{ id }}</p>
    <p><span class="font-bold">Error :</span> Instance does not exist</p>
    <form>
      <button @click="deleteInstance(id)" class="danger px-5 py-2.5 inline-flex">
        Delete instance
      </button>
    </form>
  </div>
</template>
