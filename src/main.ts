import {createApp} from 'vue'
import App from './App.vue'
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

/* import the fontawesome core */
import {library} from '@fortawesome/fontawesome-svg-core'

import {faAdd, faGear, faRightFromBracket, faStar, faCamera} from '@fortawesome/free-solid-svg-icons'
import {createRouter, createWebHashHistory} from "vue-router";
import CreateInstance from "./routes/instance/CreateInstance.vue";
import Instances from "./routes/instance/Instances.vue";
import Login from "./routes/authentication/Login.vue";
import './style.css'
import Instance from "./routes/instance/Instance.vue";
import {CurseApiService} from "mine4ease-ipc-api";
import {InstanceServiceImpl} from "./shared/services/InstanceServiceImpl.ts";
import InstanceNotFound from "./routes/instance/InstanceNotFound.vue";
import {MinecraftServiceImpl} from "./shared/services/MinecraftServiceImpl.ts";
import {AuthService} from "./shared/services/AuthService.ts";

library.add(faStar, faGear, faRightFromBracket, faAdd, faCamera);

const routes = [
  {
    path: '/instance', component: Instances, children: [
      { path: '/:id', name: 'instance', component: Instance },
      { path: '/create', name: 'instance-create', component: CreateInstance },
      { path: '/not-found', name: 'not-found', component: InstanceNotFound }
    ]
  },
  {
    path: '/login', component: Login
  },
  {
    path: '/', redirect: '/instance/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App)
.use(router)
.component('font-awesome-icon', FontAwesomeIcon);

app.provide('apiService', new CurseApiService());
app.provide('instanceService', new InstanceServiceImpl());
app.provide('minecraftService', new MinecraftServiceImpl());
app.provide('authService', new AuthService());
app.mount('#app').$nextTick(() => {
  // Remove Preload scripts loading
  postMessage({payload: 'removeLoading'}, '*')

  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
});
