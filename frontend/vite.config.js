import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = (env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
  const apiPath = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const apiOrigin = base.startsWith('/') ? '^https?://[^/]+' : '^';
  const proxy = { '/api': { target: 'http://localhost:4000', changeOrigin: true } };
  return {
    server: { proxy },
    preview: { proxy },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icons/*.png'],
        manifest: {
          id: '/',
          name: 'Carry & Co. Bags Store',
          short_name: 'Carry & Co.',
          description: 'Shop everyday bags, check laptop fit, and browse saved collections offline.',
          theme_color: '#33243d',
          background_color: '#f8f4ec',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'en',
          categories: ['shopping', 'lifestyle'],
          icons: [
            { src: '/icons/carry-co-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/carry-co-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}', 'images/photos/credits.txt'],
          navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/openapi\.yaml$/, /^\/images(?:\/|$)/],
          runtimeCaching: [
            {
              urlPattern: new RegExp(apiOrigin + apiPath + '/(?:products(?:/[a-z0-9-]+)?|categories)/?(?:\\?.*)?$'),
              method: 'GET',
              handler: 'NetworkFirst',
              options: { cacheName: 'carry-catalog', networkTimeoutSeconds: 3,
                expiration: { maxEntries: 80, maxAgeSeconds: 86400 }, cacheableResponse: { statuses: [200] } },
            },
            {
              urlPattern: ({ request, url }) => request.destination === 'image' && (url.pathname.startsWith('/images/') || !url.pathname.startsWith('/api/')),
              method: 'GET',
              handler: 'CacheFirst',
              options: { cacheName: 'carry-images', expiration: { maxEntries: 80, maxAgeSeconds: 604800, purgeOnQuotaError: true }, cacheableResponse: { statuses: [0, 200] } },
            },
          ],
        },
      }),
    ],
  };
});
