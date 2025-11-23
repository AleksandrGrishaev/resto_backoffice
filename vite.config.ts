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
        // TEMPORARILY DISABLED for diagnosis - will re-enable after fixing env vars issue
        // drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5174,
    host: true,
    fs: {
      strict: true
    }
  }
})
