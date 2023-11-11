<script setup lang="ts">

import {AuthService} from "../../shared/services/AuthService.ts";
import {inject} from "vue";
import {useRouter} from "vue-router";

const router = useRouter();
const $authService: AuthService | undefined = inject('authService');

async function login() {
  await $authService?.authenticate()
      .catch(console.log)
      .then(() => router.push('/'))
}
</script>

<template>
  <div class="bg-gray-800">
    <button v-on:click="login()">Login</button>
  </div>
</template>
