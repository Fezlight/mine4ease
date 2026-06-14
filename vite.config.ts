import fs from 'node:fs'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'
import renderer from "vite-plugin-electron-renderer";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    plugins: [
      vue(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'mine4ease-backend/main/index.ts',
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log('[startup] Mine4Ease App');
            } else {
              startup();
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rolldownOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}).filter(dep => dep !== 'mine4ease-ipc-api'),
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rolldownOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rolldownOptions.input` instead `build.lib.entry`.
          input: 'mine4ease-backend/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rolldownOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              }
            },
          },
        }
      })
    ],
    optimizeDeps: {
      exclude: [
        'mine4ease-ipc-api',
        'electron-updater',
      ],
    },
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
      return {
        host: url.hostname,
        port: url.port,
      }
    })(),
    clearScreen: false,
  }
})
