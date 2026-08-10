# Modern Mahj

A modern web-based American Mahjong app. The React app lives at the repo root — run all commands from `/Users/imon/development/my-modern-mahj/`.

Human is seat **East**; three bots play **South**, **West**, **North**. No backend — state persists to `localStorage` for offline play.

## Build & Dev Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Type-check (`tsc -b`) and produce a production build in `dist/`
- `npm run lint` — Run ESLint across the project
- `npm run test` — Run Vitest suite once
- `npm run test:watch` — Vitest in watch mode
- `npm run preview` — Serve the built `dist/` locally

## Build Verification (required after every change)

After making any code change, run `npm run build` and `npm run test` and confirm both exit 0 before reporting the task complete. Build catches type errors and bundling errors that `dev` may tolerate; tests catch game-logic regressions.

If either fails, fix the underlying issue rather than working around it.

## Architecture

Stack: **React 19 + TypeScript + Vite 8 + Zustand + Zod + Vitest**, ESLint 10 with `typescript-eslint` and React hooks/refresh plugins.

Layout:

```
.
├── index.html                 # Vite entry HTML
├── vite.config.ts             # Vite + @vitejs/plugin-react config
├── tsconfig.json              # Root TS config, references app + node
├── tsconfig.app.json          # TS config for src/
├── tsconfig.node.json         # TS config for Vite config files
├── eslint.config.js           # Flat ESLint config
├── public/                    # Static assets served as-is
└── src/
    ├── main.tsx               # App bootstrap
    ├── App.tsx                # Root React component
    ├── index.css              # Minimal reset
    ├── game/                  # Pure game logic (no React)
    │   ├── types.ts
    │   ├── rng.ts             # seeded RNG
    │   ├── tiles.ts           # 152-tile factory
    │   ├── wall.ts            # shuffle + deal + flower replacement
    │   ├── charleston.ts      # pass rotation
    │   ├── exposure.ts        # pung/kong validation + joker rules
    │   ├── jokerSwap.ts       # joker redemption
    │   ├── turn.ts            # draw/discard/call resolution
    │   ├── hands/
    │   │   ├── schema.ts
    │   │   ├── loader.ts
    │   │   ├── match.ts
    │   │   └── handsYEAR.json     # Card (user-populated)
    │   └── bots/
    │       ├── base.ts
    │       ├── beginner.ts
    │       ├── intermediate.ts
    │       ├── expert.ts
    │       └── index.ts
    ├── store/                 # Zustand
    │   ├── index.ts
    │   └── slices/
    ├── hooks/
    └── components/
```

Notes:

- `public/` assets are served from `/` at runtime.
- Game logic under `src/game/` is pure and framework-free — do NOT import React there. All bot/game randomness goes through the seeded RNG in `src/game/rng.ts` so tests are deterministic.
- TS uses project references — `tsc -b` builds both `tsconfig.app.json` and `tsconfig.node.json`.
- React Compiler is **not** enabled.

## Styling (Tailwind v4)

**All styling is Tailwind.** The inline-style migration is finished — every `style={{}}` left in `src/` is a runtime-computed value. New UI uses utility classes; do not add static inline styles.

- Tailwind v4 is wired via `@tailwindcss/vite`; `src/index.css` imports **theme + utilities only (no Preflight)** — the app keeps its own reset in `@layer base`, so bare buttons/inputs aren't restyled. Don't add Preflight without auditing.
- Design tokens live in the `@theme` block as `--color-*` / `--font-*` / `--radius-*`, so they're usable as utilities (`bg-tile-navy`, `text-suit-red`, `font-ui`, `rounded-md`). The short names (`var(--tile-navy)`, …) still resolve via back-compat aliases in `:root`.
- Reach for an existing `@layer components` atom before respelling a recipe: `.btn` + `.btn-{gold,green,ghost,outline,navy}`, `.eyebrow` / `.card-surface` (paper surfaces), `.felt-label` / `.felt-note` (felt surfaces), `.mono`. Promote a recipe to a new atom once it appears in 3+ places.
- Because Preflight is off, include `border-solid` whenever you use `border`.
- **Only runtime-computed styles stay inline** (`style={{}}`): per-tile sizing and colors, flight-overlay/emoji CSS vars, drawer bounds, pointer-tracked positions, animation strings built from a JS constant. When an element mixes both, put the static properties in `className` and leave only the computed ones inline.
- `@keyframes`, the `.board-grid` template, and `.opp-tiles`' media query stay in `index.css`.
- **Tailwind scans raw source text**, so a class it can't see emits no CSS and fails silently through build, test, and lint. Always leave a space before `${` in a template-literal `className` (`` `flex gap-2 ${on ? "bg-gold" : ""}` ``) and never assemble class names by concatenation. After adding arbitrary-value utilities, confirm they landed: `npm run build`, then grep `dist/assets/*.css` for the escaped selector (e.g. `gap-\[14px\]`).
