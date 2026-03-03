import type { EnemyType } from "./types.ts";

// ─── Per-enemy-type tuning ────────────────────────────────────

export interface EnemyTypeConfig {
  speed: number; // base z-units/s
  hp: number;
  points: number;
  spawnWeight: number; // relative probability weight
}

// ─── Master game configuration ────────────────────────────────

export interface GameConfig {
  // Grid
  readonly lanes: number;

  // Z-axis
  readonly zFar: number; // where enemies spawn
  readonly zNear: number; // player z position (conceptually 0)
  readonly nearThreshold: number; // z <= this ⇒ enemy reached player

  // Player
  readonly playerStartLane: number;
  readonly autoFireEnabled: boolean;
  readonly fireRate: number; // shots per second
  readonly bulletSpeed: number; // z-units/s

  // Collision
  readonly hitWindow: number; // |Δz| for bullet↔enemy hit

  // Scoring
  readonly comboWindowSeconds: number;
  readonly multiplierThresholds: readonly number[]; // combo-count breakpoints

  // Spawning
  readonly baseSpawnInterval: number; // seconds between spawns at difficulty 1
  readonly difficultyRampPerSecond: number;
  readonly maxDifficulty: number;
  readonly enemyTypes: Record<EnemyType, EnemyTypeConfig>;

  // Fixed timestep
  readonly fixedDt: number; // seconds per simulation tick (1/60)
  readonly maxAccumulatedDt: number; // clamp to prevent spiral of death
}

// ─── Defaults ──────────────────────────────────────────────────

export const DEFAULT_CONFIG: GameConfig = {
  lanes: 12,

  zFar: 120,
  zNear: 0,
  nearThreshold: 2.0,

  playerStartLane: 6,
  autoFireEnabled: true,
  fireRate: 5, // 5 shots/s → 0.2 s cooldown
  bulletSpeed: 80,

  hitWindow: 1.5,

  comboWindowSeconds: 2.0,
  multiplierThresholds: [5, 15, 30, 50], // x2 at 5 kills, x3 at 15, …

  baseSpawnInterval: 1.2,
  difficultyRampPerSecond: 0.02,
  maxDifficulty: 5.0,

  enemyTypes: {
    Runner: { speed: 15, hp: 1, points: 100, spawnWeight: 60 },
    Drifter: { speed: 10, hp: 1, points: 200, spawnWeight: 30 },
    Charger: { speed: 30, hp: 2, points: 500, spawnWeight: 10 },
  },

  fixedDt: 1 / 60,
  maxAccumulatedDt: 0.25,
};
