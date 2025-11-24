import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 允许导入兄弟目录中的客户端库
      allow: ['..']
    },
    port: 5173
  }
})
