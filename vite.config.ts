import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cloudflare({
      // Configure the plugin to work with our Worker
      functionEntrypoint: 'src/worker.ts',
      // Use the public directory for static assets
      assetsDirectory: 'public'
    })
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      external: []
    }
  }
})
