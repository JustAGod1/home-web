import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to your Go server
      '/api': {
        target: 'http://localhost:8080', // Your Go server address
        changeOrigin: true,
        secure: false,
      },
      // You can add more proxy rules as needed
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          react: ['react', 'react-dom'],
          vendor: ['lodash', 'axios'],
        }
      }
    }
  },
  resolve: {
    alias: {
      // Setup path aliases for cleaner imports
      '@': '/src',
      '@components': '/src/components',
      '@assets': '/src/assets'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  }
})
