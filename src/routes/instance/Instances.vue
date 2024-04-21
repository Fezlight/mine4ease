<script setup lang="ts">
import InstanceIcon from "../../shared/components/instance/InstanceIcon.vue";
import {inject, provide, Ref, ref} from "vue";
import {useRouter} from "vue-router";
import {IAuthService, IGlobalSettingService, IInstanceService, Instance, Settings} from "mine4ease-ipc-api";
import {Transitions} from "../../shared/models/Transitions";

const selectedInstance: Ref<Instance | undefined> = ref();
const currentInstance: Ref<Instance | undefined> = ref();
const settings: Ref<Settings | undefined> = ref();
provide('currentInstance', currentInstance);

const router = useRouter();
const $instanceService: IInstanceService | undefined = inject('instanceService');
const $globalSettingsService: IGlobalSettingService | undefined = inject('globalSettingsService');
const $authService: IAuthService | undefined = inject('authService');

$authService?.getProfile()
.catch(() => router.push('/login'));

function createInstance() {
  selectedInstance.value = undefined;
  router.push({path: '/create'});
}

function selectInstance(instance: Instance) {
  if (instance === selectedInstance.value) {
    return;
  }

  selectedInstance.value = instance;
  if (settings.value) {
    settings.value.selectedInstance = instance.id;
  }

  $instanceService?.selectInstance(instance.id)
  .then(() => $instanceService?.getInstanceById(instance.id))
  .then(currInstance => {
    currentInstance.value = currInstance;
    router.push({name: 'instance', params: {id: instance.id}});
  })
  .catch(() => {
    router.push({name: '/not-found', query: {id: instance.id}});
  });
}

function addInstance(instance: Instance) {
  if (settings.value && !settings.value.instances) {
    settings.value.instances = [];
  }
  
  settings.value?.instances?.push(instance);
  selectInstance(instance);
}

function deleteInstance(id: string) {
  if (!settings?.value?.instances) {
    throw new Error("No instance found with id : " + id);
  }

  const index = settings.value.instances.findIndex(i => i.id === id);
  if (index !== -1) {
    settings.value?.instances?.splice(index, 1);
  }

  if (settings?.value?.instances.length === 0) {
    createInstance();
    return;
  }

  const precedingInstance = settings?.value?.instances[index - 1];
  if (precedingInstance) {
    selectInstance(precedingInstance);
  } else {
    selectInstance(settings?.value?.instances[index + 1]);
  }
}

function redirect(t: Transitions) {
  router.push(t.route);
}

$globalSettingsService?.retrieveSettings().then(data => {
  settings.value = data;
  let selectedModpack = data.instances?.filter(i => i.id === data.selectedInstance);
  if (selectedModpack && selectedModpack.length > 0) {
    selectInstance(selectedModpack[0]);
  } else {
    createInstance();
  }
});
</script>
<template>
  <div class="grid grid-cols-[80px_1fr]">
    <section class="flex flex-col menu-left max-window-height bg-gray-800">
      <div class="flex flex-col flex-grow gap-4 overflow-y-auto py-2">
        <InstanceIcon :id="instance.id"
                      :class="{ 'active': selectedInstance === instance }"
                      v-for="instance in settings?.instances"
                      :key="instance.id"
                      @click="selectInstance(instance)">
          <template v-slot:pre-icon>
            <span class="h-1/2 my-auto border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl hidden group-[.active]:hidden group-hover:block"></span>
            <span class="border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl invisible group-hover:hidden group-[.active]:visible group-[.active]:block"></span>
          </template>
          <template v-slot:default>
            <img :src="'mine4ease-icon://' + `${instance.id}/${instance.iconName}`"
                 alt="Instance logo"
                 class="object-cover" />
          </template>
        </InstanceIcon>
        <InstanceIcon @click="createInstance()" custom-class="bg-sky-600/60">
          <template v-slot:pre-icon>
            <span class="h-1/2 my-auto border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl hidden group-[.active]:hidden group-hover:block"></span>
            <span class="border-l-4 border-white/30 rounded-br-2xl rounded-tr-2xl invisible group-hover:hidden group-[.active]:visible group-[.active]:block"></span>
          </template>
          <template v-slot:default>
            <font-awesome-icon class="text-2xl text-white" :icon="['fas', 'add']" />
          </template>
        </InstanceIcon>
      </div>
      <div class=" z-10 shadow-black/50 p-2 rounded-t-md border-t-[1px] border-gray-500/60 flex flex-col justify-center gap-2">
        <button type="button" class="group rounded-lg hover:bg-gray-700/60 flex justify-center">
          <font-awesome-icon class="p-2 text-2xl text-white/80 h-[34px]"
                             :icon="['fas', 'gear']" />
        </button>
        <button type="button"
                class="group rounded-lg hover:bg-gray-700/60 flex justify-center"
                @click="router.push('/login')">
          <font-awesome-icon class="p-2 text-2xl text-white/80 h-[34px] group-hover:text-red-700/80"
                             :icon="['fas', 'right-from-bracket']" />
        </button>
      </div>
    </section>
    <router-view @create-instance="addInstance" @delete-instance="deleteInstance" @redirect="(t: Transitions) => redirect(t)"></router-view>
  </div>
</template>
<style scoped>
.menu-left {
  @apply max-h-screen shadow-xl shadow-black/80 border-r-[1px] border-gray-500/60;
}
</style>
