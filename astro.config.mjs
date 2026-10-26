import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://cobblestar-mc.fr',
  srcDir: './public-site/src',
  publicDir: './public-site/static',
  outDir: './public-astro',
  cacheDir: './.astro-cache',
  output: 'server',
  trailingSlash: 'always',
  adapter: node({ mode: 'middleware' }),
  vite: { build: { sourcemap: false } },
});
