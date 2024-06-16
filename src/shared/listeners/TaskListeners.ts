import IpcRendererEvent = Electron.IpcRendererEvent;

export class TaskListeners {
  start(taskName: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) {
    console.log("Task listening started");
    window.ipcRenderer.on(taskName, callback);
  }
}
