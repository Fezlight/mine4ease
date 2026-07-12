import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'
import tailwindcss from "@tailwindcss/vite";

// Resolve the local `mine4ease-ipc-api` lib straight from its TypeScript sources.
// This way it is compiled together with the app and does not need to be
// (re)installed into node_modules after every change.
const ipcApiEntry = fileURLToPath(new URL('./mine4ease-ipc-api/index.ts', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    plugins: [
      tailwindcss({
        optimize: {
          minify: isBuild,
        },
      }),
      vue(),
      electron({
        main: {
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
                // `mine4ease-ipc-api` is intentionally NOT external: it is aliased to its
                // TypeScript sources (see `resolve.alias`) and bundled directly into the app.
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        preload: {
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
    resolve: {
      alias: {
        'mine4ease-ipc-api': ipcApiEntry,
      },
    },
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
