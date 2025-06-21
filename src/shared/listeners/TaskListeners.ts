import IpcRendererEvent = Electron.IpcRendererEvent;

export class TaskListeners {
  start(taskName: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) {
    window.ipcRenderer.on(taskName, callback);
  }
}
