// Core: engine-agnostic game simulation
// Public API surface for renderer, UI, and tests.

// ─── Game class ────────────────────────────────────────────────
export { Game } from "./game.ts";

// ─── Config ────────────────────────────────────────────────────
export { DEFAULT_CONFIG } from "./config.ts";
export type { GameConfig, EnemyTypeConfig } from "./config.ts";

// ─── Types ─────────────────────────────────────────────────────
export { EnemyType, EntityTag, RunPhase } from "./types.ts";
export type {
  GameState,
  PlayerState,
  EnemyEntity,
  BulletEntity,
  PickupEntity,
  Entity,
} from "./types.ts";

// ─── Input ─────────────────────────────────────────────────────
export { InputAction } from "./input.ts";

// ─── Events ────────────────────────────────────────────────────
export { GameEventKind } from "./events.ts";
export type {
  GameEvent,
  EnemySpawnedEvent,
  EnemyKilledEvent,
  PlayerHitEvent,
  BulletFiredEvent,
  ScoreChangedEvent,
  ComboChangedEvent,
  PhaseChangedEvent,
} from "./events.ts";

// ─── PRNG ──────────────────────────────────────────────────────
export { createPrng } from "./prng.ts";
