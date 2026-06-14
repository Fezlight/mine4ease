import IpcRendererEvent = Electron.IpcRendererEvent;

export class TaskListeners {
  start(taskName: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) {
    console.debug(`[DEBUG] Registering listener for ${taskName}`);
    window.ipcRenderer.on(taskName, (event, ...args) => {
      console.debug(`[DEBUG] Received event ${taskName}`, args);
      callback(event, ...args);
    });
  }
}
