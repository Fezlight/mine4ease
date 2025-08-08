<script setup lang="ts">
import {Ref, ref} from "vue";
import {TASK_EVENT_NAME, TASK_PROCESSING_EVENT_NAME, TaskEvent} from "mine4ease-ipc-api";
import {TaskListeners} from "../../listeners/TaskListeners";
import {updateProgress, updateState} from "../../utils/Utils";

const currentEvent: Ref<TaskEvent | undefined> = ref();
const props = defineProps<{
  listener: TaskListeners,
  disableStateChange?: boolean,
  showProgress?: boolean
}>();
const disableStateChange: Ref<boolean> = ref(props.disableStateChange ?? false);
const showProgress: Ref<boolean> = ref(props.showProgress ?? false);

async function createEvent(promise: () => Promise<string>, endCallback?: Function) {
  let eventId: string = await promise();
  currentEvent.value = {
    id: eventId,
    name: "",
    state: "IN_PROGRESS",
    progress: 0
  };

  if (currentEvent.value) {
    props.listener.start(TASK_EVENT_NAME,(event, args) => updateState(<TaskEvent>currentEvent.value, args, endCallback));
    props.listener.start(TASK_PROCESSING_EVENT_NAME,(event, args) => updateProgress(<TaskEvent>currentEvent.value, args));
  }
}

</script>
<template>
  <span class="flex flex-col items-center justify-center gap-2">
    <span v-if="!currentEvent || currentEvent?.state === 'RETRY_NEEDED' || disableStateChange">
      <slot :createEvent="createEvent"></slot>
    </span>
    <slot name="IN_PROGRESS" v-if="currentEvent?.state === 'IN_PROGRESS' && !disableStateChange"
          class="flex flex-col items-center justify-center">
      <font-awesome-icon class="self-center w-7 h-7" :icon="['fas', 'gear']" spin />
      <span v-if="showProgress" class="text-gray-400 text-sm">Processing ... {{currentEvent.progress}} %</span>
    </slot>
    <slot name="FINISHED" v-if="currentEvent?.state === 'FINISHED' && !disableStateChange">
      <font-awesome-icon class="flex w-7 h-7 text-green-600" :icon="['fas', 'circle-check']" />
    </slot>
    <slot name="FAILED" v-if="currentEvent?.state === 'FAILED' && !disableStateChange">
      <font-awesome-icon class="flex w-7 h-7 text-red-600" :icon="['fas', 'circle-xmark']" />
    </slot>
  </span>
</template>
