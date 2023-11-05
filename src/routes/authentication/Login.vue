<script setup lang="ts">

import {AuthService} from "../../shared/services/AuthService.ts";
import {inject} from "vue";

const $authService: AuthService | undefined = inject('authService');

async function login() {
  await $authService?.authenticate().then(console.log);
}
</script>

<template>
  <div class="bg-gray-800">
    <button v-on:click="login()">Login</button>
  </div>
</template>
