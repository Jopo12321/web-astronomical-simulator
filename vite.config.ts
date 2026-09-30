import esbuild from 'esbuild';
import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';

const OFFLINE_FILE = 'web-astronomical-simulator.html';
const LIVE_URL = 'https://jopo12321.github.io/web-astronomical-simulator/';

function escapeClose(tag: 'script' | 'style', source: string): string {
  return source.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

function inlineBuild(): Plugin {
  return {
    name: 'inline-build',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const htmlName = Object.keys(bundle).find((name) => name.endsWith('.html'));
      if (!htmlName) return;
      const html = bundle[htmlName];
      if (html?.type !== 'asset') return;
      const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
      if (chunks.length !== 1) {
        this.error(`The offline file needs one script. This build has ${chunks.length}.`);
      }
      const transformed = await esbuild.transform(chunks[0]?.code ?? '', {
        loader: 'js',
        format: 'iife',
        target: 'es2022',
        legalComments: 'none',
      });
      const css = Object.entries(bundle)
        .filter(([name, item]) => item.type === 'asset' && name.endsWith('.css'))
        .map(([, item]) => (item.type === 'asset' ? String(item.source) : ''))
        .join('\n');
      let source = String(html.source);
      source = source.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi, '');
      source = source.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gi, '');
      source = source.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '');
      const note = `<p id="offline-note">If this page stays blank, download ${OFFLINE_FILE} and open that file in a browser. GitHub does not run it. The live app is <a href="${LIVE_URL}">${LIVE_URL}</a>.</p>`;
      source = source.replace('<div id="app"></div>', `<div id="app">${note}</div>`);
      if (css) {
        source = source.replace('</head>', `<style>${escapeClose('style', css)}</style></head>`);
      }
      source = source.replace(
        '</body>',
        `<script>${escapeClose('script', transformed.code)}</script></body>`,
      );
      html.fileName = OFFLINE_FILE;
      html.source = source;
      bundle[OFFLINE_FILE] = html;
      for (const name of Object.keys(bundle)) {
        if (name !== OFFLINE_FILE) delete bundle[name];
      }
    },
  };
}

const offline = process.env.OFFLINE === '1';

// Project Pages are served from /web-astronomical-simulator/. Local and
// offline builds stay at /. CI sets VITE_BASE for the hosted build.
export default defineConfig({
  base: offline ? '/' : (process.env.VITE_BASE ?? '/'),
  plugins: [preact(), ...(offline ? [inlineBuild()] : [])],
  build: {
    target: 'es2022',
    sourcemap: !offline,
    cssCodeSplit: !offline,
    modulePreload: !offline,
    outDir: offline ? 'dist-offline' : 'dist',
    rollupOptions: offline
      ? {
          output: {
            inlineDynamicImports: true,
          },
        }
      : undefined,
  },
});
