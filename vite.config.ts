import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fromScripts = process.argv.join(',').includes('mode');
if (fromScripts) {
  require('./build')
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
