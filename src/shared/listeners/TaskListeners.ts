import {TASK_EVENT_NAME} from "mine4ease-ipc-api";
import IpcRendererEvent = Electron.IpcRendererEvent;

export class TaskListeners {
  start(callback: (event: IpcRendererEvent, ...args: any[]) => void) {
    console.log("Task listening started");
    window.ipcRenderer.on(TASK_EVENT_NAME, callback);
  }

  stop() {
    console.log("Task listening stopped");
    window.ipcRenderer.removeAllListeners(TASK_EVENT_NAME);
  }
}
