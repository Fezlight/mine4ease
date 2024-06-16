import {createApp} from 'vue'
import App from './App.vue'
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {library} from '@fortawesome/fontawesome-svg-core'
import {
  faAdd,
  faArrowLeft,
  faArrowRight,
  faArrowRotateRight,
  faArrowUpRightFromSquare,
  faBook,
  faCamera,
  faCheck,
  faCircleArrowUp,
  faCircleCheck,
  faCircleUp,
  faCircleXmark,
  faCode,
  faDownload,
  faGear,
  faGlobe,
  faMagnifyingGlass,
  faPlay,
  faRightFromBracket,
  faSpinner,
  faStar,
  faTrashCan,
  faUpRightFromSquare
} from '@fortawesome/free-solid-svg-icons'
import {createRouter, createWebHashHistory} from "vue-router";
import CreateInstance from "./routes/instance/create-instance/CreateInstance.vue";
import Instances from "./routes/instance/Instances.vue";
import Login from "./routes/authentication/Login.vue";
import './style.css'
import Instance from "./routes/instance/instance/Instance.vue";
import {InstanceService} from "./shared/services/InstanceService";
import InstanceNotFound from "./routes/instance/instance-error/InstanceNotFound.vue";
import {MinecraftService} from "./shared/services/MinecraftService";
import {AuthService} from "./shared/services/AuthService";
import {GlobalSettingsService} from "./shared/services/GlobalSettingsService";
import Mods from "./routes/mods/Mods.vue";
import {ModService} from "./shared/services/ModService";
import ModDetails from "./routes/mods/mod-details/ModDetails.vue";
import InstanceMods from "./routes/instance/instance/mods/InstanceMods.vue";
import CreateInstanceCustom from './routes/instance/create-instance/CreateInstanceCustom.vue';
import ModPacks from "./routes/modpacks/ModPacks.vue";
import ModPackDetails from "./routes/modpacks/modpacks-details/ModPackDetails.vue";
import {faMicrosoft} from "@fortawesome/free-brands-svg-icons";
import InstanceSettings from "./routes/instance/instance/settings/InstanceSettings.vue";
import InstanceTiles from "./routes/instance/instance/tiles/InstanceTiles.vue";

library.add(
  faStar, faGear, faRightFromBracket, faAdd, faCamera, faMicrosoft,
  faTrashCan, faArrowRight, faArrowLeft, faPlay, faCircleXmark, faCircleCheck,
  faSpinner, faCheck, faUpRightFromSquare, faDownload, faBook, faCode,
  faArrowUpRightFromSquare, faCircleUp, faArrowRotateRight, faMagnifyingGlass,
  faGlobe, faCircleArrowUp
);
const routes = [
  {
    path: '/instance', component: Instances, children: [
      { path: ':id', component: Instance, children : [
          { path: 'settings', component: InstanceSettings },
          { path: 'mods', component: InstanceMods },
          { path: '', component: InstanceTiles },
        ]
      },
      { path: 'create', component: CreateInstance },
      { path: 'create/custom', component: CreateInstanceCustom },
      { path: 'not-found', component: InstanceNotFound },
      { path: '/mods', component: Mods },
      { path: '/mods/:id', component: ModDetails },
      { path: '/modpacks', component: ModPacks },
      { path: '/modpacks/:id', component: ModPackDetails },
    ]
  },
  {
    path: '/login', component: Login
  },
  {
    path: '/', redirect: '/instance'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
.use(router)
.component('font-awesome-icon', FontAwesomeIcon);

app.provide('instanceService', new InstanceService());
app.provide('modService', new ModService());
app.provide('minecraftService', new MinecraftService());
app.provide('authService', new AuthService());
app.provide('globalSettingsService', new GlobalSettingsService());
app.mount('#app').$nextTick(() => {
  postMessage({payload: 'removeLoading'}, '*');
});
