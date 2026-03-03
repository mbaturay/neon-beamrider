# Neon Beamrider

A Beamrider-style arcade shooter built with TypeScript and Babylon.js. Enemies approach through a glowing tube; shoot them down, chain combos for multipliers, and survive the warp sequences.

## Getting Started

```bash
npm install
npm run dev       # development server with HMR
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Controls

| Key | Action |
|---|---|
| Arrow Left / A | Move left one lane |
| Arrow Right / D | Move right one lane |
| Space | Fire (hold for continuous, or auto-fire is on by default) |
| R | Reset / restart the run |
| 1 / 2 / 3 | Switch theme: Neon / Retro / Chunky |
| Q | Cycle quality: Low → Medium → High |

## Themes

Three visual themes, hot-swappable at runtime:

- **Neon** (default) — dark tube, cyan/magenta palette, bloom post-processing, Fresnel emissive materials, spark VFX
- **Retro** — warm CRT aesthetic, amber/green/orange palette, no bloom, simple ring VFX
- **Chunky** — bold flat colors, expanding/rotating cube VFX

Retro and Chunky are dynamically imported for code splitting.

## Quality Levels

Press **Q** to cycle through quality settings:

- **High** — full bloom, 5 spark particles per explosion
- **Medium** — reduced bloom, 3 sparks
- **Low** — no bloom, no sparks (ring-only explosions)

## Architecture

```
src/
├── core/            # Pure game simulation (no DOM, no engine)
│   ├── game.ts      #   Game class: fixed-timestep loop, state, events
│   ├── entities.ts  #   Entity factories, movement, collision detection
│   ├── spawn.ts     #   Spawn director (difficulty-ramped enemy frequency)
│   ├── events.ts    #   Discriminated-union event system
│   ├── config.ts    #   Game tuning constants
│   ├── types.ts     #   All game-state and entity type definitions
│   ├── prng.ts      #   Seeded PRNG (mulberry32)
│   └── input.ts     #   Input action enum
│
├── renderer/        # Babylon.js rendering layer
│   ├── Renderer.ts  #   Scene setup, camera, lighting, theme application
│   ├── EntityPool.ts#   Entity↔mesh mapping with free-list pooling
│   ├── meshFactory.ts#  Template meshes (player, enemies, bullets, gates)
│   ├── materials.ts #   Theme→MaterialSet bridge
│   ├── effects.ts   #   VFX manager (delegates to theme's VfxFactory)
│   ├── mapping.ts   #   Game-space → world-space coordinate mapping
│   └── constants.ts #   Geometry and camera constants
│
├── themes/          # Visual theme system
│   ├── themeTypes.ts#   Theme interface, ThemeId, QualityLevel, palettes
│   ├── loadTheme.ts #   Async theme loader (dynamic import for code split)
│   ├── neon/        #   Neon theme (bloom, Fresnel, spark particles)
│   ├── retro/       #   Retro theme (CRT amber, simple VFX)
│   └── chunky/      #   Chunky theme (flat colors, cube VFX)
│
├── ui/              # HTML HUD overlay
│   ├── hud.ts       #   DOM-cached HUD updates (score, combo, warp, game over)
│   └── styles.css   #   Minimal neon-styled CSS
│
├── app.ts           # Application controller (rAF loop, input routing)
└── main.ts          # Entry point (bootstrap)
```

### Key Design Decisions

- **Fixed-timestep simulation** — Core runs at 60 Hz regardless of frame rate, with interpolation for smooth rendering
- **Event-driven VFX** — Game emits events (kills, warps, etc.); renderer reacts without coupling
- **Zero per-frame allocations** in hot paths — static scratch vectors, reusable array buffers, shared Sets
- **Mesh pooling** — EntityPool uses free-lists to recycle enemy/bullet/gate meshes instead of dispose/re-clone
- **Theme hot-swap** — Materials, post-processing, and VFX are fully replaceable at runtime
- **Code splitting** — Retro and Chunky themes are dynamically imported, keeping initial bundle smaller
