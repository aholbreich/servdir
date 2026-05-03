// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Important switch: default remains the current server runtime.
// Static mode is opt-in and intentionally avoids changing the default deployment path.
const isStaticBuild = process.env.SERVDIR_BUILD_MODE === 'static';
const staticBasePath = process.env.SERVDIR_BASE_PATH;
const staticSiteUrl = process.env.SERVDIR_SITE_URL;

export default defineConfig({
  // Static builds do not use the Node adapter because they emit plain prerendered files.
  ...(isStaticBuild ? {} : { adapter: node({ mode: 'standalone' }) }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 4321),
  },
  ...(isStaticBuild && staticBasePath ? { base: staticBasePath } : {}),
  ...(isStaticBuild && staticSiteUrl ? { site: staticSiteUrl } : {}),
  // This is the main Astro output-mode switch for dual deployment support.
  output: isStaticBuild ? 'static' : 'server',
});
