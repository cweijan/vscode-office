import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vditorDevPlugin, vditorProdBuildPlugin } from './vite/vditorPlugin'

const cwd = process.cwd()
const argv = process.argv
const isProdBuild = argv.includes('build') && argv.some((arg) => arg.includes('production'))

if (isProdBuild) {
  rmSync(resolve(cwd, 'out'), { recursive: true, force: true })
}

if (argv.join(',').includes('mode')) {
  require('./build')
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    command === 'serve' ?
      vditorDevPlugin() : vditorProdBuildPlugin()
  ],
  server: {
    cors: {
      origin: true,
    },
    host: '127.0.0.1',
    port: 5739,
    fs: {
      allow: ['..'],
    },
  },
  base: '',
  build: {
    outDir: 'out/webview',
    chunkSizeWarningLimit: 2048,
  }
}))
