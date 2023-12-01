<script setup lang="ts">
import InstanceIcon from "../../shared/components/InstanceIcon.vue";
import {inject, Ref, ref} from "vue";
import {useRouter} from "vue-router";
import {IAuthService, IGlobalSettingService, IInstanceService, Instance, Settings} from "mine4ease-ipc-api";

const selectedInstance: Ref<Instance | undefined> = ref();
const settings: Ref<Settings | undefined> = ref();

const router = useRouter();
const $instanceService: IInstanceService | undefined = inject('instanceService');
const $globalSettingsService: IGlobalSettingService | undefined = inject('globalSettingsService');
const $authService: IAuthService | undefined = inject('authService');

$authService?.getProfile().then(account => {
  console.log(account);
}).catch(() => router.push('/login'));

function createModPack() {
  selectedInstance.value = undefined;
  router.push({name: 'instance-create'});
}

function selectModPack(instance: Instance) {
  if (instance === selectedInstance.value) {
    return;
  }

  selectedInstance.value = instance;
  if (settings.value) {
    settings.value.selectedInstance = instance.id;
  }

  $instanceService?.selectInstance(instance.id)
  .then(() => router.push({name: 'instance', params: {id: instance.id}}));
}

function addInstance(instance: Instance) {
  settings.value?.instances?.push(instance);
  selectModPack(instance);
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
    createModPack();
    return;
  }

  const precedingInstance = settings?.value?.instances[index - 1];
  if (precedingInstance) {
    selectModPack(precedingInstance);
  } else {
    selectModPack(settings?.value?.instances[index + 1]);
  }
}

$globalSettingsService?.retrieveSettings().then(data => {
  settings.value = data;
  let selectedModpack = data.instances.filter(i => i.id === data.selectedInstance);
  if (selectedModpack && selectedModpack.length > 0) {
    selectModPack(selectedModpack[0]);
  }
});
</script>
<template>
  <div class="flex flex-row">
    <section class="sticky top-[30px] flex flex-col menu-left max-window-height bg-gray-800 w-[70px]">
      <div id="scroll-container" class="flex flex-col flex-grow gap-2 p-2 overflow-y-auto">
        <InstanceIcon :id="instance.id"
                      :class="{ 'active': selectedInstance == instance }"
                      v-for="instance in settings?.instances"
                      @click="selectModPack(instance)">
          <img :src="'mine4ease-icon://' + `${instance.id}/${instance.iconName}`"
               alt="Instance logo"
               class="object-cover" />
        </InstanceIcon>
        <InstanceIcon @click="createModPack()" custom-class="bg-sky-600/60">
          <font-awesome-icon class="text-2xl text-white" :icon="['fas', 'add']" />
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
    <section class="content">
      <router-view @create-instance="addInstance" @delete-instance="deleteInstance"></router-view>
    </section>
  </div>
</template>
<style scoped>
::-webkit-scrollbar {
  display: none;
}

.menu-left {
  @apply max-h-screen shadow-xl shadow-black/80 border-r-[1px] border-gray-500/60;
}
</style>
