import { defineConfig } from 'vite';
import { driftScript } from 'driftscript/vite';

export default defineConfig({
  base: './',
  plugins: [driftScript()],
  server: {
    port: 5173,
  },
});
