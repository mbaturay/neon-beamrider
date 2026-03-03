// ──────────────────────────────────────────────────────────────
// Coordinate-system convention
// ──────────────────────────────────────────────────────────────
// laneIndex : integer in [0, lanes-1]. Lane 0 is leftmost.
// z-axis    : enemies spawn at zFar (e.g. 120) and advance toward z = 0.
//             bullets travel from z ≈ 0 (player) toward zFar.
//             positive z = deeper into the screen, away from the player.
// ──────────────────────────────────────────────────────────────

// ─── Enemy Types ───────────────────────────────────────────────
// const-object + type-union pattern (erasableSyntaxOnly forbids enum)

export const EnemyType = {
  Runner: "Runner",
  Drifter: "Drifter",
  Charger: "Charger",
} as const;

export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType];

// ─── Entity Tags ───────────────────────────────────────────────

export const EntityTag = {
  Enemy: "Enemy",
  Bullet: "Bullet",
  Pickup: "Pickup",
} as const;

export type EntityTag = (typeof EntityTag)[keyof typeof EntityTag];

// ─── Run Phase ─────────────────────────────────────────────────

export const RunPhase = {
  Ready: "Ready",
  Playing: "Playing",
  GameOver: "GameOver",
} as const;

export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase];

// ─── Entity interfaces ────────────────────────────────────────

export interface EnemyEntity {
  readonly tag: typeof EntityTag.Enemy;
  id: number;
  enemyType: EnemyType;
  laneIndex: number;
  z: number;
  speed: number; // z-units/s, positive ⇒ toward player (z decreases)
  hp: number;
  alive: boolean;
}

export interface BulletEntity {
  readonly tag: typeof EntityTag.Bullet;
  id: number;
  laneIndex: number;
  z: number;
  speed: number; // z-units/s, positive ⇒ away from player (z increases)
  alive: boolean;
}

export interface PickupEntity {
  readonly tag: typeof EntityTag.Pickup;
  id: number;
  laneIndex: number;
  z: number;
  speed: number;
  pickupType: string; // stub for future expansion
  alive: boolean;
}

export type Entity = EnemyEntity | BulletEntity | PickupEntity;

// ─── Player state ──────────────────────────────────────────────

export interface PlayerState {
  laneIndex: number;
  alive: boolean;
  fireCooldownRemaining: number; // seconds until next shot allowed
  score: number;
  multiplier: number;
  comboTimer: number; // seconds remaining in current combo window
  comboCount: number; // consecutive kills in current combo
}

// ─── Game State ────────────────────────────────────────────────

export interface GameState {
  phase: RunPhase;
  tick: number; // monotonic fixed-step counter
  elapsed: number; // total elapsed game time (seconds)
  player: PlayerState;
  enemies: EnemyEntity[];
  bullets: BulletEntity[];
  pickups: PickupEntity[];
  nextEntityId: number; // auto-incrementing id
  spawnAccumulator: number;
  difficulty: number; // scalar that ramps over time (starts 1.0)
}
