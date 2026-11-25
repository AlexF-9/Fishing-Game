import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
});
