import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  ...(command === 'build' ? {
    build: {
      lib: {
        entry: 'src/entry.ts',
        name: 'ViewInRoomWidget',
        fileName: () => 'widget.iife.js',
        formats: ['iife'],
      },
      rollupOptions: {
        output: { inlineDynamicImports: true },
      },
    },
    define: { 'process.env.NODE_ENV': '"production"' },
  } : {}),
}))
