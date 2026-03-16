import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Stamps sw.js with a build timestamp so the browser detects a new version.
 * Runs once at the end of every production build.
 */
function swVersionStamp(): Plugin {
  return {
    name: 'sw-version-stamp',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      try {
        const content = readFileSync(swPath, 'utf-8')
        const stamped = content.replace(
          "const CACHE_VERSION = 'v2'",
          `const CACHE_VERSION = 'v2-${Date.now()}'`
        )
        writeFileSync(swPath, stamped)
        console.log('[sw-version-stamp] Stamped sw.js with build timestamp')
      } catch {
        // sw.js not found — not a critical error
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), swVersionStamp()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: ['@mdi/font/css/materialdesignicons.css']
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          vendor: ['vue', 'vue-router', 'pinia'],
          icons: ['@mdi/font/css/materialdesignicons.css']
        }
      }
    },
    terserOptions: {
      compress: {
        // Keep console.log in all builds
        // Production log control is handled by DebugUtils and ENV.debugLevel
        drop_console: false,
        drop_debugger: false
      }
    }
  },
  server: {
    port: 5174,
    host: true,
    fs: {
      strict: true
    },
    hmr: {
      // Debounce HMR updates to reduce reload frequency
      overlay: true
    },
    watch: {
      // Reduce filesystem watching overhead
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      // Debounce watcher events (milliseconds)
      // This prevents multiple rapid reloads when files are saved
      awaitWriteFinish: {
        stabilityThreshold: 500, // Wait 500ms after last change
        pollInterval: 100
      }
    }
  }
})
