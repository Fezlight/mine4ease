import {createApp} from 'vue'
import App from './App.vue'
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from '@fortawesome/fontawesome-svg-core'
import {faAdd, faGear, faRightFromBracket, faStar, faCamera, faTrashCan, faArrowRight, faPlay} from '@fortawesome/free-solid-svg-icons'
import {createRouter, createWebHashHistory} from "vue-router";
import CreateInstance from "./routes/instance/create-instance/CreateInstance.vue";
import Instances from "./routes/instance/Instances.vue";
import Login from "./routes/authentication/Login.vue";
import './style.css'
import Instance from "./routes/instance/instance/Instance.vue";
import {CurseApiService} from "mine4ease-ipc-api";
import {InstanceService} from "./shared/services/InstanceService.ts";
import InstanceNotFound from "./routes/instance/instance-error/InstanceNotFound.vue";
import {MinecraftService} from "./shared/services/MinecraftService.ts";
import {AuthService} from "./shared/services/AuthService.ts";
import {faMicrosoft} from "@fortawesome/free-brands-svg-icons";
import {GlobalSettingsService} from "./shared/services/GlobalSettingsService.ts";

library.add(faStar, faGear, faRightFromBracket, faAdd, faCamera, faMicrosoft, faTrashCan, faArrowRight, faPlay);

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
app.provide('instanceService', new InstanceService());
app.provide('minecraftService', new MinecraftService());
app.provide('authService', new AuthService());
app.provide('globalSettingsService', new GlobalSettingsService());
app.mount('#app').$nextTick(() => {
  postMessage({payload: 'removeLoading'}, '*');
});
