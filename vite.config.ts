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
        // Only remove console.log in production builds
        // Preview and development builds will keep console.log
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
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
