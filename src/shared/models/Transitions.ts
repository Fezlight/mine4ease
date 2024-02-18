import {RouteLocationRaw} from "vue-router";
import {Instance} from "mine4ease-ipc-api";

export interface Transitions {
  route: RouteLocationRaw;
  instance: Instance;
}
