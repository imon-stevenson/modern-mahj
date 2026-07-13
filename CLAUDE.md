# Modern Mahj

A modern web-based Mahjong application. The React app lives in `my-modern-mahj/` — run all commands from that directory.

## Build & Dev Commands

All commands run from `my-modern-mahj/`:

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Type-check (`tsc -b`) and produce a production build in `dist/`
- `npm run lint` — Run ESLint across the project
- `npm run preview` — Serve the built `dist/` locally

## Build Verification (required after every change)

After making any code change, run `npm run build` from `my-modern-mahj/` and confirm it exits 0 before reporting the task complete. The build runs the TypeScript compiler and Vite bundler, so it catches both type errors and bundling errors that `dev` may tolerate.

If the build fails, fix the underlying issue rather than working around it — do not skip this step.

## Architecture

Stack: **React 19 + TypeScript + Vite 8**, ESLint 10 with `typescript-eslint` and React hooks/refresh plugins.

Layout:

```
my-modern-mahj/
├── index.html            # Vite entry HTML
├── vite.config.ts        # Vite + @vitejs/plugin-react config
├── tsconfig.json         # Root TS config, references app + node configs
├── tsconfig.app.json     # TS config for src/
├── tsconfig.node.json    # TS config for Vite config files
├── eslint.config.js      # Flat ESLint config
├── public/               # Static assets served as-is (favicon, icons)
└── src/
    ├── main.tsx          # App bootstrap — mounts <App /> into #root
    ├── App.tsx           # Root React component
    ├── App.css           # Component styles
    ├── index.css         # Global styles
    └── assets/           # Imported assets (bundled by Vite)
```

Notes:
- `public/` assets are served from `/` at runtime; `src/assets/` are imported and hashed by Vite.
- TS uses project references — `tsc -b` builds both `tsconfig.app.json` and `tsconfig.node.json`.
- React Compiler is **not** enabled (see README).
