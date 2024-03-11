<script setup lang="ts">
import {InstanceSettings, Mod, TaskEvent} from "mine4ease-ipc-api";
import {ObjectWithState} from "../../models/State";
import {TaskListeners} from "../../listeners/TaskListeners";
import {ModService} from "../../services/ModService";
import {inject, Ref} from "vue";

const $modService: ModService | undefined = inject('modService');
const instance: Ref<InstanceSettings | undefined> | undefined = inject('currentInstance');

const props = defineProps<{
  mod: Mod & ObjectWithState,
  listener: TaskListeners
}>();

function updateState(_event: any, value: TaskEvent) {
  if(props.mod.eventId == value.id) {
    if(value.state === 'FINISHED') {
      props.mod.state = "finished";
    } else if(value.state === 'FAILED') {
      props.mod.state = 'errored';
      setTimeout(() => props.mod.state = undefined, 3000);
    }
  }
}

function addMod(mod: Mod & ObjectWithState) {
  if(!instance?.value) return;

  $modService?.addMod(mod, instance.value)
    .then(eventId => {
      mod.eventId = eventId;
      mod.state = "loading"
      props.listener.start(updateState);
    });
}

const emit = defineEmits<{
  (e: 'addMod'): void
}>();
</script>
<template>
  <article class="rounded-lg bg-black/30 shadow-md shadow-black/40">
    <div class="grid grid-cols-[96px_8fr_81px] gap-4 px-4 py-5">
      <a href="#">
        <img v-bind:src="mod.iconUrl" v-bind:alt="mod.displayName + ' icon'" class="object-cover">
      </a>
      <div class="flex flex-col justify-between">
        <h3>{{ mod.displayName }}</h3>
        <p class="text-sm">{{ mod.description }}</p>
        <p class="text-gray-400 text-sm">by {{mod.authors?.map(a => a.name).join(', ')}}</p>
      </div>
      <div class="flex items-center justify-center">
        <button type="button" class="px-5 py-2.5 primary" v-on:click="addMod(mod)" v-if="!mod.state">
          <font-awesome-icon :icon="['fas', 'add']" />
          Add
        </button>
        <font-awesome-icon class="flex w-7 h-7" :icon="['fas', 'gear']" spin v-if="mod.state === 'loading'" />
        <font-awesome-icon class="flex w-7 h-7 text-green-600" :icon="['fas', 'circle-check']" v-if="mod.state === 'finished'" />
        <font-awesome-icon class="flex w-7 h-7 text-red-600" :icon="['fas', 'circle-xmark']" v-if="mod.state === 'errored'" />
      </div>
    </div>
    <div class="border-b-2 border-amber-400"></div>
    <div class="flex flex-row gap-4 px-4 py-5">
      <div class="justify-self-start flex flex-row items-center gap-2 justify-between" v-for="categorie in mod.categories">
        <img v-bind:src="categorie.iconUrl" v-bind:alt="categorie.name + ' icon'" class="w-7 h-7">
        <span class="text-sm">{{categorie.name}}</span>
      </div>
    </div>
  </article>
</template>
