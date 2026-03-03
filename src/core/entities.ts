import type { EnemyEntity, BulletEntity, GateEntity, EnemyType } from "./types.ts";
import { EntityTag } from "./types.ts";
import type { EnemyTypeConfig, GameConfig } from "./config.ts";

// ─── Factory functions ─────────────────────────────────────────

export function createEnemy(
  id: number,
  enemyType: EnemyType,
  laneIndex: number,
  zStart: number,
  typeConfig: EnemyTypeConfig,
): EnemyEntity {
  return {
    tag: EntityTag.Enemy,
    id,
    enemyType,
    laneIndex,
    z: zStart,
    speed: typeConfig.speed,
    hp: typeConfig.hp,
    alive: true,
  };
}

export function createBullet(
  id: number,
  laneIndex: number,
  zStart: number,
  speed: number,
): BulletEntity {
  return {
    tag: EntityTag.Bullet,
    id,
    laneIndex,
    z: zStart,
    speed,
    alive: true,
  };
}

export function createGate(
  id: number,
  laneIndex: number,
  z: number,
): GateEntity {
  return {
    tag: EntityTag.Gate,
    id,
    laneIndex,
    z,
    alive: true,
  };
}

// ─── Reusable buffer (avoid per-frame allocation) ────────────────

const _reachedBuf: number[] = [];

// ─── Movement ──────────────────────────────────────────────────

/**
 * Advance all living enemies toward z = 0.
 * Returns ids of enemies that reached the player zone (z <= nearThreshold).
 * WARNING: Returns a shared buffer. Consume before next call.
 */
export function updateEnemies(
  enemies: EnemyEntity[],
  dt: number,
  nearThreshold: number,
): number[] {
  _reachedBuf.length = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    e.z -= e.speed * dt; // enemies advance toward z = 0
    if (e.z <= nearThreshold) {
      _reachedBuf.push(e.id);
      e.alive = false;
    }
  }
  return _reachedBuf;
}

/**
 * Advance all living bullets away from the player (z increases).
 * Mark dead if past zFar.
 */
export function updateBullets(
  bullets: BulletEntity[],
  dt: number,
  zFar: number,
): void {
  for (const b of bullets) {
    if (!b.alive) continue;
    b.z += b.speed * dt; // bullets travel toward zFar
    if (b.z >= zFar) {
      b.alive = false;
    }
  }
}

// ─── Collision detection ───────────────────────────────────────

export interface HitResult {
  enemyId: number;
  bulletId: number;
  enemyType: EnemyType;
  laneIndex: number;
  z: number;
}

const _hitBuf: HitResult[] = [];

/**
 * Check alive bullets against alive enemies.
 * Hit condition: same lane AND |Δz| < hitWindow.
 * Each bullet can hit at most one enemy per step.
 * WARNING: Returns a shared buffer. Consume before next call.
 */
export function detectCollisions(
  enemies: EnemyEntity[],
  bullets: BulletEntity[],
  config: GameConfig,
): HitResult[] {
  _hitBuf.length = 0;

  for (const b of bullets) {
    if (!b.alive) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (b.laneIndex !== e.laneIndex) continue;
      if (Math.abs(b.z - e.z) < config.hitWindow) {
        e.hp -= 1;
        b.alive = false; // bullet consumed
        if (e.hp <= 0) {
          e.alive = false;
          _hitBuf.push({
            enemyId: e.id,
            bulletId: b.id,
            enemyType: e.enemyType,
            laneIndex: e.laneIndex,
            z: e.z,
          });
        }
        break; // this bullet is spent; next bullet
      }
    }
  }

  return _hitBuf;
}

// ─── Gate collision detection ─────────────────────────────────

export interface GateHitResult {
  gateId: number;
  laneIndex: number;
  z: number;
}

const _gateHitBuf: GateHitResult[] = [];

/**
 * Check alive bullets against alive gates.
 * Same-lane, |Δz| < hitWindow. Each bullet hits at most one gate.
 * WARNING: Returns a shared buffer. Consume before next call.
 */
export function detectGateCollisions(
  gates: GateEntity[],
  bullets: BulletEntity[],
  hitWindow: number,
): GateHitResult[] {
  _gateHitBuf.length = 0;

  for (const b of bullets) {
    if (!b.alive) continue;
    for (const g of gates) {
      if (!g.alive) continue;
      if (b.laneIndex !== g.laneIndex) continue;
      if (Math.abs(b.z - g.z) < hitWindow) {
        g.alive = false;
        b.alive = false;
        _gateHitBuf.push({
          gateId: g.id,
          laneIndex: g.laneIndex,
          z: g.z,
        });
        break;
      }
    }
  }

  return _gateHitBuf;
}

// ─── Garbage collection ────────────────────────────────────────

/** In-place compaction: removes dead entities with no allocation. */
export function sweep<T extends { alive: boolean }>(entities: T[]): T[] {
  let write = 0;
  for (let read = 0; read < entities.length; read++) {
    if (entities[read].alive) {
      entities[write] = entities[read];
      write++;
    }
  }
  entities.length = write;
  return entities;
}
