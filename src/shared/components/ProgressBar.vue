<script setup lang="ts">
import {TaskListeners} from "../listeners/TaskListeners";
import {ref, Ref} from "vue";
import {GAME_LAUNCHED_EVENT_NAME, TASK_EVENT_NAME, TASK_PROCESSING_EVENT_NAME, TaskEvent} from "mine4ease-ipc-api";

const events: Ref<{ [key: string]: TaskEvent }> = ref({});
const currentEvent = ref<TaskEvent>();
const currentProgress = ref<number>();
let clearEvent;

function updateEvent(_event: any, value: TaskEvent) {
  events.value[value.id] = value;
  clearTimeout(clearEvent);
  if (value.state === "IN_PROGRESS") {
    currentEvent.value = value;
    currentProgress.value = 0;
  } else if (value.state === "FINISHED") {
    currentProgress.value = 100;
    clearEvent = setTimeout(() => currentEvent.value = undefined, 5000);
  }
}

function updateProgress(_event: any, progress: number) {
  currentProgress.value = progress;
}

const listener = new TaskListeners();
listener.start(TASK_EVENT_NAME, updateEvent);
listener.start(TASK_PROCESSING_EVENT_NAME, updateProgress);
listener.start(GAME_LAUNCHED_EVENT_NAME, () => currentEvent.value = undefined);
</script>
<template>
  <section class="flex flex-col border-t-2 border-gray-700/30 p-4 sticky bottom-0 left-0 w-full bg-gray-800" v-if="currentEvent">
    <div class="flex justify-between mb-1">
      <span class="text-base font-medium text-white">{{ currentEvent.name }}</span>
      <span class="text-sm font-medium text-white">{{currentProgress}}%</span>
    </div>
    <div class="bg-gray-700 rounded-full h-2.5">
      <div class="bg-blue-600 h-2.5 rounded-full" :style="'width:' + currentProgress + '%'"></div>
    </div>
  </section>
</template>
