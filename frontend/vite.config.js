import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@pages':    path.resolve(__dirname, 'src/pages'),
      '@shared':   path.resolve(__dirname, 'src/shared'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@api':      path.resolve(__dirname, 'src/api.js'),
      '@apiDir':   path.resolve(__dirname, 'src/api'),
      '@nav':      path.resolve(__dirname, 'src/navConfig.js'),
      '@static':   path.resolve(__dirname, 'src/shared/static'),
    },
  },
  server: {
    proxy: {
      '/api':    { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/media':  { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
    },
  },
})