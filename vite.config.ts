import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// Project Pages are served from /web-astronomical-simulator/. Local and
// offline builds stay at /. CI sets VITE_BASE for the hosted build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [preact()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
