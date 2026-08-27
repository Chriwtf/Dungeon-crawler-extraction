import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { driftScript } from 'driftscript/vite';

export default defineConfig({
  base: './',
  plugins: [driftScript()],
  resolve: {
    alias: {
      driftscript: fileURLToPath(new URL('./node_modules/driftscript/dist/index.js', import.meta.url)),
      '@driftengine/physics': fileURLToPath(new URL('../driftengine/packages/physics/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
