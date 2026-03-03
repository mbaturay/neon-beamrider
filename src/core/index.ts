// Core: engine-agnostic game simulation
// Public API surface for renderer, UI, and tests.

// ─── Game class ────────────────────────────────────────────────
export { Game } from "./game.ts";

// ─── Config ────────────────────────────────────────────────────
export { DEFAULT_CONFIG } from "./config.ts";
export type { GameConfig, EnemyTypeConfig } from "./config.ts";

// ─── Types ─────────────────────────────────────────────────────
export { EnemyType, EntityTag, RunPhase, WarpPhase } from "./types.ts";
export type {
  GameState,
  PlayerState,
  EnemyEntity,
  BulletEntity,
  PickupEntity,
  GateEntity,
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
  WarpStartedEvent,
  WarpEndedEvent,
  GateHitEvent,
} from "./events.ts";

// ─── PRNG ──────────────────────────────────────────────────────
export { createPrng } from "./prng.ts";
