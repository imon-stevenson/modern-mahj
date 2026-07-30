# My Modern Mahj

A modern, web-based **American Mahjong** game. By me, Imon! You'll have a slight advantage by taking the **East** seat as you play against three bots (South, West, North). You can change the difficulty level from beginner, to intermediate, to expert as you master the game.

Everything runs in the browser and game state persists to `localStorage`, so you can close the tab and pick up the game where you left it.

Built with **React 19 + TypeScript + Vite**, game state in **Zustand**, and
schema validation via **Zod**.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (Vite, with hot reload)
npm run dev
```

Then open the URL Vite prints (typically <http://localhost:5173>). The board is
designed for a viewport **at least 1000px wide**.

Click **Start Game**, choose a difficulty, and take your seat at the Mahjong table.

### Other commands

| Command           | What it does                                         |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot-module reload     |
| `npm run build`   | Type-check (`tsc -b`) and produce a production build |
| `npm run preview` | Serve the production build from `dist/` locally      |
| `npm run lint`    | Run ESLint across the project                        |

## Testing

The game logic is covered by a [Vitest](https://vitest.dev/) suite—tile generation, the wall/deal, Charleston
rotation, exposures and joker rules, hand matching, bot decisions, and rack
ordering. Because all randomness flows through a seeded RNG, the tests are
deterministic.

```bash
npm run test        # run the suite once
npm run test:watch  # re-run on change while developing
```

`npm run build` also type-checks the whole project.

## How the game plays

**Setup & The Charleston**
<br/>
Everyone is dealt their tiles (as East, you get 14, but the others get 13), then the Charleston begins:

- **First Charleston** (compulsory): pass 3 tiles right, across, then left (ROL)
- **Second Charleston** (optional): pass 3 tiles left, across, then right (LOR). This only happens if _every_ player agrees. If any bot declines, you're told and it's skipped.
- **Courtesy pass**: you and the player across from you agree on a number of tiles (0–3) to swap. If your partner, West, offers fewer than you asked, you must agree to that number or decline the courtesy.

**Playing a Turn**
<br/>
On your turn, click **Draw tile** to draw from the wall (the newly drawn tile sits at the far right of your rack and is momentarily highlighted), then simply click a tile to discard it. Bots take a moment to "think" before playing, and every discard floats to the central discard pile.

**Claiming Discards**
<br/>
When another player discards a tile you want to use, a prompt lets you claim it for a **pung** (three of a kind) or **kong** (four), or call
**Mahjong** if it completes your hand. Claimed tiles are _exposed_ above your rack,
rotated to face your opponents—which as you know, is good table etiquette.

**Your Rack**
<br/>
Drag tiles to rearrange your hand, or click **Default Sort** to group
them our preferred way: by suit and number (jokers left, winds in N-E-W-S order). Remember, Jokers can stand in for tiles in pungs/kongs and can be reclaimed by swapping in the real tile.

**Winning**
<br/>
Complete one of the hands from the 2025 NMJL card to win. The wall counter shows how many tiles remain. If it runs out with no winner, the hand is a wall game 😢.

**Difficulty** sets both how well the bots play and how long you get to claim a discard (beginner has no timer).

## Project layout

```
src/
├── game/        # Pure, framework-free game logic (tiles, wall, turns, bots, hands)
├── store/       # Zustand state (game store + small animation stores)
├── hooks/       # React hooks (bot turns, call timer, discard animation)
└── components/  # Board, racks, tiles, prompts, and overlays
```

See [`CLAUDE.md`](./CLAUDE.md) for a fuller architecture overview and contributor
conventions.
