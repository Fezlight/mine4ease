import {RouteLocationRaw} from "vue-router";
import {Transitions} from "../models/Transitions";
import {TaskEvent} from "mine4ease-ipc-api";

export function redirect(route: RouteLocationRaw, emit: Function) {
  let transition: Transitions = {
    route: route
  }

  emit('redirect', transition);
}

export function transformDownloadCount(downloadCount: number | undefined) {
  if (!downloadCount) return "";

  if ((downloadCount / 1000000) > 1) {
    return (downloadCount / 1000000).toFixed(2) + " M";
  } else if ((downloadCount / 100000) > 1) {
    return (downloadCount / 100000).toFixed(2) + " m";
  } else if ((downloadCount / 1000) > 1) {
    return (downloadCount / 1000).toFixed(2) + " K";
  }
}

export function updateState(object: TaskEvent, _event: any, value: TaskEvent, endCallback?: Function) {
  if(object.id == value.id) {
    object.state = value.state;
    if(value.state === 'FAILED') {
      setTimeout(() => object.state = "RETRY_NEEDED", 3000);
    } else if(value.state === 'FINISHED' && endCallback) {
      endCallback()
    }
  }
}
