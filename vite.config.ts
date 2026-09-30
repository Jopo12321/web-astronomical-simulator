import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';

function inlineBuild(): Plugin {
  return {
    name: 'inline-build',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlName = Object.keys(bundle).find((name) => name.endsWith('.html'));
      if (!htmlName) return;
      const html = bundle[htmlName];
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'chunk') {
          source = source.replace(
            /<script type="module"[^>]*><\/script>/,
            `<script type="module">${item.code}</script>`,
          );
        }
        if (item.type === 'asset' && name.endsWith('.css')) {
          source = source.replace(
            /<link rel="stylesheet"[^>]*>/,
            `<style>${String(item.source)}</style>`,
          );
        }
      }
      html.source = source;
      for (const name of Object.keys(bundle)) {
        if (name !== htmlName) delete bundle[name];
      }
    },
  };
}

const offline = process.env.OFFLINE === '1';

// Project Pages are served from /web-astronomical-simulator/. Local and
// offline builds stay at /. CI sets VITE_BASE for the hosted build.
export default defineConfig({
  base: offline ? '/' : (process.env.VITE_BASE ?? '/'),
  plugins: [preact(), offline ? inlineBuild() : undefined],
  build: {
    target: 'es2022',
    sourcemap: !offline,
    cssCodeSplit: !offline,
    outDir: offline ? 'dist-offline' : 'dist',
  },
});
