import {
  defineConfig,
  minimal2023Preset as preset,
} from "@vite-pwa/assets-generator/config"

// Rasterizes public/app-icon.svg into the PWA icon set (192, 512, maskable 512,
// apple-touch-icon 180). Run with `npm run generate:pwa-assets` after changing
// the source mark; the generated PNGs are committed.
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset,
  images: ["public/app-icon.svg"],
})
