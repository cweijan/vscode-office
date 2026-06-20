import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import chokidar from 'chokidar'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const cwd = process.cwd()
const vditorDir = resolve(cwd, 'vditor')
const viteBin = resolve(cwd, 'node_modules/vite/bin/vite.js')
const argv = process.argv
const isProdBuild = argv.includes('build') && argv.some((arg) => arg.includes('production'))

if (isProdBuild) {
  rmSync(resolve(cwd, 'out'), { recursive: true, force: true })
}

if (argv.join(',').includes('mode')) {
  require('./build')
}

function runVditorBuild(production: boolean) {
  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--mode', production ? 'production' : 'development'],
    { cwd: vditorDir, stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error('vditor build failed')
  }
}

function vditorDevPlugin(): Plugin {
  let building = false

  return {
    name: 'vditor-dev-watch',
    apply: 'serve',
    configureServer(server) {
      runVditorBuild(false)
      const watcher = chokidar.watch(
        [resolve(vditorDir, 'src'), resolve(vditorDir, 'vite.config.ts')],
        { ignoreInitial: true },
      )
      watcher.on('change', () => {
        if (building) {
          return
        }
        building = true
        try {
          runVditorBuild(false)
        } catch (err) {
          console.error(err)
        } finally {
          building = false
        }
      })
      server.httpServer?.once('close', () => watcher.close())
    },
  }
}

function vditorProdBuildPlugin(): Plugin {
  return {
    name: 'vditor-prod-build',
    apply: 'build',
    closeBundle() {
      runVditorBuild(true)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    ...(command === 'serve' && mode === 'development' ? [vditorDevPlugin()] : []),
    ...(command === 'build' && mode === 'production' ? [vditorProdBuildPlugin()] : []),
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
