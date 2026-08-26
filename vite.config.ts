import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { driftScript } from 'driftscript/vite';

export default defineConfig({
  base: './',
  plugins: [driftScript()],
  resolve: {
    alias: {
      driftscript: fileURLToPath(new URL('../driftengine/packages/driftscript/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
