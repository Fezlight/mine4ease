<script setup lang="ts">
import {Ref, ref} from "vue";
import {TASK_EVENT_NAME, TaskEvent} from "mine4ease-ipc-api";
import {TaskListeners} from "../../listeners/TaskListeners";
import {updateState} from "../../utils/Utils";

const currentEvent: Ref<TaskEvent | undefined> = ref();
const props = defineProps<{
  listener: TaskListeners
}>();

async function createEvent(promise: Promise<string>, endCallback?: Function) {
  let eventId: string = await promise;
  currentEvent.value = {
    id: eventId,
    name: "",
    state: "IN_PROGRESS"
  };

  if(currentEvent.value) {
    props.listener.start(TASK_EVENT_NAME,(event, args) => updateState(<TaskEvent>currentEvent.value, event, args, endCallback));
  }
}

</script>
<template>
  <span>
    <span v-if="!currentEvent || currentEvent?.state === 'RETRY_NEEDED'">
      <slot :createEvent="createEvent"></slot>
    </span>
    <font-awesome-icon class="flex w-7 h-7" :icon="['fas', 'gear']" spin v-if="currentEvent?.state === 'IN_PROGRESS'" />
    <font-awesome-icon class="flex w-7 h-7 text-green-600" :icon="['fas', 'circle-check']" v-if="currentEvent?.state === 'FINISHED'" />
    <font-awesome-icon class="flex w-7 h-7 text-red-600" :icon="['fas', 'circle-xmark']" v-if="currentEvent?.state === 'FAILED'" />
  </span>
</template>
