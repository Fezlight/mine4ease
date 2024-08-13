<script setup lang="ts">
import {Ref, ref} from "vue";
import {TASK_EVENT_NAME, TaskEvent} from "mine4ease-ipc-api";
import {TaskListeners} from "../../listeners/TaskListeners";
import {updateState} from "../../utils/Utils";

const currentEvent: Ref<TaskEvent | undefined> = ref();
const props = defineProps<{
  listener: TaskListeners,
  disableStateChange?: boolean
}>();
const disableStateChange: Ref<boolean> = ref(props.disableStateChange ?? false);

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
    <span v-if="!currentEvent || currentEvent?.state === 'RETRY_NEEDED' || disableStateChange">
      <slot :createEvent="createEvent"></slot>
    </span>
    <slot name="IN_PROGRESS" v-if="currentEvent?.state === 'IN_PROGRESS' && !disableStateChange">
      <font-awesome-icon class="flex w-7 h-7" :icon="['fas', 'gear']" spin />
    </slot>
    <slot name="FINISHED" v-if="currentEvent?.state === 'FINISHED' && !disableStateChange">
      <font-awesome-icon class="flex w-7 h-7 text-green-600" :icon="['fas', 'circle-check']" />
    </slot>
    <slot name="FAILED" v-if="currentEvent?.state === 'FAILED' && !disableStateChange">
      <font-awesome-icon class="flex w-7 h-7 text-red-600" :icon="['fas', 'circle-xmark']" />
    </slot>
  </span>
</template>
