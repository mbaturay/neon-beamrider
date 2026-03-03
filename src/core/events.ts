import type { EnemyType, RunPhase } from "./types.ts";

// ─── Event Kinds ───────────────────────────────────────────────

export const GameEventKind = {
  EnemySpawned: "EnemySpawned",
  EnemyKilled: "EnemyKilled",
  PlayerHit: "PlayerHit",
  BulletFired: "BulletFired",
  ScoreChanged: "ScoreChanged",
  ComboChanged: "ComboChanged",
  PhaseChanged: "PhaseChanged",
  WarpStarted: "WarpStarted",
  WarpEnded: "WarpEnded",
  GateHit: "GateHit",
} as const;

export type GameEventKind =
  (typeof GameEventKind)[keyof typeof GameEventKind];

// ─── Event payloads (discriminated union on `kind`) ───────────

export interface EnemySpawnedEvent {
  readonly kind: typeof GameEventKind.EnemySpawned;
  readonly entityId: number;
  readonly enemyType: EnemyType;
  readonly laneIndex: number;
  readonly z: number;
}

export interface EnemyKilledEvent {
  readonly kind: typeof GameEventKind.EnemyKilled;
  readonly entityId: number;
  readonly enemyType: EnemyType;
  readonly laneIndex: number;
  readonly z: number;
  readonly points: number;
}

export interface PlayerHitEvent {
  readonly kind: typeof GameEventKind.PlayerHit;
  readonly enemyId: number;
  readonly laneIndex: number;
}

export interface BulletFiredEvent {
  readonly kind: typeof GameEventKind.BulletFired;
  readonly entityId: number;
  readonly laneIndex: number;
}

export interface ScoreChangedEvent {
  readonly kind: typeof GameEventKind.ScoreChanged;
  readonly score: number;
  readonly delta: number;
}

export interface ComboChangedEvent {
  readonly kind: typeof GameEventKind.ComboChanged;
  readonly comboCount: number;
  readonly multiplier: number;
}

export interface PhaseChangedEvent {
  readonly kind: typeof GameEventKind.PhaseChanged;
  readonly phase: RunPhase;
}

export interface WarpStartedEvent {
  readonly kind: typeof GameEventKind.WarpStarted;
}

export interface WarpEndedEvent {
  readonly kind: typeof GameEventKind.WarpEnded;
}

export interface GateHitEvent {
  readonly kind: typeof GameEventKind.GateHit;
  readonly entityId: number;
  readonly laneIndex: number;
  readonly z: number;
  readonly points: number;
}

export type GameEvent =
  | EnemySpawnedEvent
  | EnemyKilledEvent
  | PlayerHitEvent
  | BulletFiredEvent
  | ScoreChangedEvent
  | ComboChangedEvent
  | PhaseChangedEvent
  | WarpStartedEvent
  | WarpEndedEvent
  | GateHitEvent;

// ─── Event queue ───────────────────────────────────────────────
// Populated during a simulation step, consumed by renderer after
// step() returns, then drained.

export class EventQueue {
  private events: GameEvent[] = [];

  push(event: GameEvent): void {
    this.events.push(event);
  }

  /** Returns accumulated events and resets the internal buffer (zero-copy). */
  drain(): readonly GameEvent[] {
    const snapshot = this.events;
    this.events = [];
    return snapshot;
  }
}
