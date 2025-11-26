import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
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
