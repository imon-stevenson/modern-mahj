import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': the app is a game, so it asks before
      // reloading instead of yanking the board mid-turn. See UpdatePrompt.tsx.
      registerType: 'prompt',
      // No `includeAssets`: the globPatterns below already sweep every svg/png/
      // ico copied out of public/, and listing them twice double-counts them in
      // the precache manifest.
      //
      // pwa-assets.config.ts is auto-detected by this plugin. The PNGs are
      // generated ahead of time by `npm run generate:pwa-assets` and committed,
      // so the manifest below owns them outright and the integration stays off.
      //
      // The icons listed in `manifest.icons` are precached by the plugin AND
      // swept again by globPatterns, so they appear twice in the build's entry
      // count. Both copies carry the same revision hash, so Workbox dedupes
      // them at runtime—nothing is fetched or stored twice.
      pwaAssets: { disabled: true },
      manifest: {
        name: 'Modern Mahj',
        short_name: 'Mahj',
        description:
          'A modern web-based American Mahjong game. Take the East seat against three bots—no account, no network, plays offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // The mat is a three-column grid with a 660px min-height, so it wants
        // width. Revisit if a phone-responsive layout ever lands.
        orientation: 'landscape',
        // Hex equivalents of the --color-felt and --color-ivory oklch tokens in
        // index.css, so the splash screen matches the app.
        theme_color: '#091b31',
        background_color: '#f7f5f1',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // woff2 matters: without it the self-hosted fonts are fetched over the
        // network and an offline cold start falls back to system faces.
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Lets the service worker be exercised from `npm run dev`.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
