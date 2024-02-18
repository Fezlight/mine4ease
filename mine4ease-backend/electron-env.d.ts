declare namespace NodeJS {
  interface ProcessEnv {
    DIST: string;
    DIST_ELECTRON: string
    VITE_PUBLIC: string;
    APP_DIRECTORY: string;
    LOG_DIRECTORY: string;
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
}
