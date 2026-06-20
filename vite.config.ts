import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import chokidar from 'chokidar'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const fromScripts = process.argv.join(',').includes('mode');
if (fromScripts) {
  require('./build')
}

function vditorDevPlugin(): Plugin {
  let building = false

  return {
    name: 'vditor-dev-watch',
    apply: 'serve',
    configureServer(server) {
      const vditorDir = resolve(process.cwd(), 'vditor')
      const watcher = chokidar.watch(
        [resolve(vditorDir, 'src'), resolve(vditorDir, 'vite.config.ts')],
        { ignoreInitial: true },
      )
      watcher.on('change', () => {
        if (building) {
          return
        }
        building = true
        spawn('npm', ['run', 'build'], { cwd: vditorDir, stdio: 'inherit', shell: true })
          .on('exit', () => {
            building = false
          })
      })
      server.httpServer?.once('close', () => watcher.close())
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    ...(command === 'serve' && mode === 'development' ? [vditorDevPlugin()] : []),
  ],
  server: {
    cors: false,
    host: '127.0.0.1',
    port: 5739,
    headers: {
      'Access-Control-Allow-Origin': '*',
      Origin: null
    },
  },
  base: '',
  build: {
    outDir: 'out/webview',
    chunkSizeWarningLimit: 2048,
  }
}))
