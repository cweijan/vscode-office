import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import chokidar from 'chokidar'
import type { Plugin } from 'vite'

const cwd = process.cwd()
const vditorDir = resolve(cwd, 'vditor')
const viteBin = resolve(cwd, 'node_modules/vite/bin/vite.js')

const DEBOUNCE_MS = 500
const COOLDOWN_MS = 2000

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

export function vditorDevPlugin(): Plugin {
  let building = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let lastBuildAt = 0

  const scheduleBuild = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      runBuildWhenReady()
    }, DEBOUNCE_MS)
  }

  const runBuildWhenReady = () => {
    if (building) {
      scheduleBuild()
      return
    }
    const elapsed = Date.now() - lastBuildAt
    if (lastBuildAt > 0 && elapsed < COOLDOWN_MS) {
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined
        runBuildWhenReady()
      }, COOLDOWN_MS - elapsed)
      return
    }
    building = true
    try {
      runVditorBuild(false)
      lastBuildAt = Date.now()
    } catch (err) {
      console.error(err)
    } finally {
      building = false
    }
  }

  return {
    name: 'vditor-dev-watch',
    apply: 'serve',
    configureServer(server) {
      runVditorBuild(false)
      lastBuildAt = Date.now()
      const watcher = chokidar.watch(
        [resolve(vditorDir, 'src'), resolve(vditorDir, 'vite.config.ts')],
        {
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
          },
        },
      )
      watcher.on('change', scheduleBuild)
      server.httpServer?.once('close', () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        watcher.close()
      })
    },
  }
}

export function vditorProdBuildPlugin(): Plugin {
  return {
    name: 'vditor-prod-build',
    apply: 'build',
    closeBundle() {
      runVditorBuild(true)
    },
  }
}
